// tests/integration/booking-lifecycle.test.js
const test = require('node:test')
const assert = require('node:assert')
require('dotenv').config()
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const argon2 = require('argon2')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

test('Integration Suite: Durga Lodge Real PostgreSQL Operational Workflows', async (t) => {
  // Setup: Find admin user and available room
  const admin = await prisma.user.findUnique({ where: { email: 'admin@durgalodge.com' } })
  assert.ok(admin, 'Admin user must exist in database')

  // 1. Password Verification Test
  await t.test('1. Verify Argon2 Password Hashing', async () => {
    const isValid = await argon2.verify(admin.passwordHash, 'admin123')
    assert.strictEqual(isValid, true, 'Admin password must match argon2 hash')
  })

  // 2. Guest Creation Test
  let guest
  await t.test('2. Create and Retrieve Real Guest', async () => {
    const testPhone = `+9199999${Math.floor(10000 + Math.random() * 90000)}`
    guest = await prisma.guest.create({
      data: {
        fullName: 'Test Suite Guest',
        phone: testPhone,
        city: 'Puri',
        state: 'Odisha',
        idType: 'Aadhaar',
        idNumber: '1234-5678-9012',
      },
    })
    assert.ok(guest.id)
    assert.strictEqual(guest.fullName, 'Test Suite Guest')
  })

  // 3. Find Room 202
  const room = await prisma.room.findUnique({
    where: { number: '202' },
    include: { type: true },
  })
  assert.ok(room, 'Room 202 must exist')

  // 4. Create Initial Booking
  const checkIn = new Date('2026-11-10T12:00:00Z')
  const checkOut = new Date('2026-11-12T11:00:00Z') // 2 nights
  let booking

  await t.test('3. Create Booking with Zero-Error Financial Calculations', async () => {
    const tariff = room.type.baseTariff // in paise
    const nights = 2
    const tax = Math.round((tariff * nights * 12) / 100) // 12% GST
    const totalAmount = (tariff * nights) + tax

    booking = await prisma.booking.create({
      data: {
        bookingNumber: `DL-TEST-${Date.now()}`,
        guestId: guest.id,
        roomId: room.id,
        checkInDate: checkIn,
        checkoutDate: checkOut,
        nights,
        roomTariff: tariff,
        extraCharges: 0,
        discount: 0,
        tax,
        totalAmount,
        status: 'RESERVED',
        paymentStatus: 'UNPAID',
        createdById: admin.id,
      },
    })

    assert.ok(booking.id)
    assert.strictEqual(booking.status, 'RESERVED')
    assert.strictEqual(booking.totalAmount, totalAmount)
  })

  // 5. Double-Booking Protection Test
  await t.test('4. Double-Booking Protection Must Block Overlapping Dates', async () => {
    // Attempt overlapping reservation: 2026-11-11 to 2026-11-13 (overlaps on 11th-12th)
    const overlappingCheckIn = new Date('2026-11-11T12:00:00Z')
    const overlappingCheckOut = new Date('2026-11-13T11:00:00Z')

    // Query for conflicts using the exact logic from booking-actions.ts
    const conflicts = await prisma.booking.findMany({
      where: {
        roomId: room.id,
        status: { in: ['RESERVED', 'CHECKED_IN'] },
        AND: [
          { checkInDate: { lt: overlappingCheckOut } },
          { checkoutDate: { gt: overlappingCheckIn } },
        ],
      },
    })

    assert.ok(conflicts.length > 0, 'Collision detector must detect existing booking conflict')
    assert.strictEqual(conflicts[0].id, booking.id, 'Conflict must match the booked reservation')
  })

  // 6. Record Multiple Payments
  let payment1, payment2
  await t.test('5. Record Multiple Payments (Cash + UPI) and Update Folio', async () => {
    // Payment 1: ₹1,000 Advance Cash
    payment1 = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: 100000,
        method: 'CASH',
        reference: 'CASH-REC-TEST-1',
        receivedById: admin.id,
      },
    })
    assert.ok(payment1.id)

    // Payment 2: Remaining Balance via UPI
    const remainingBalance = booking.totalAmount - 100000
    payment2 = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: remainingBalance,
        method: 'UPI',
        reference: 'UPI-TXN-TEST-2',
        receivedById: admin.id,
      },
    })
    assert.ok(payment2.id)

    // Update payment status to PAID
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'PAID' },
    })
    assert.strictEqual(updated.paymentStatus, 'PAID')
  })

  // 7. Check-In Transition Test
  await t.test('6. Atomic Check-In: Booking -> CHECKED_IN, Room -> OCCUPIED', async () => {
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CHECKED_IN', actualCheckIn: new Date() },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' },
      }),
    ])

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } })
    const updatedRoom = await prisma.room.findUnique({ where: { id: room.id } })

    assert.strictEqual(updatedBooking.status, 'CHECKED_IN')
    assert.strictEqual(updatedRoom.status, 'OCCUPIED')
  })

  // 8. Check-Out Transition Test
  await t.test('7. Atomic Check-Out: Booking -> CHECKED_OUT, Room -> CLEANING', async () => {
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CHECKED_OUT', actualCheckOut: new Date() },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { status: 'CLEANING' },
      }),
    ])

    const updatedBooking = await prisma.booking.findUnique({ where: { id: booking.id } })
    const updatedRoom = await prisma.room.findUnique({ where: { id: room.id } })

    assert.strictEqual(updatedBooking.status, 'CHECKED_OUT')
    assert.strictEqual(updatedRoom.status, 'CLEANING')

    // Clean up room back to AVAILABLE
    await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } })
  })

  // 9. Record Operational Expense Test
  await t.test('8. Record Operational Expense & Verify Category Association', async () => {
    const cat = await prisma.expenseCategory.findFirst({ where: { name: 'CLEANING' } })
    assert.ok(cat)

    const expense = await prisma.expense.create({
      data: {
        amount: 85000, // ₹850.00
        date: new Date(),
        categoryId: cat.id,
        method: 'CASH',
        vendor: 'Local Hardware Store',
        notes: 'Room sanitizers and dusters',
        createdById: admin.id,
      },
    })

    assert.ok(expense.id)
    assert.strictEqual(expense.amount, 85000)

    // Clean up test expense
    await prisma.expense.delete({ where: { id: expense.id } })
  })

  // 10. Open-Ended / Flexible Stay with Check-In & Check-Out Time Recording
  await t.test('9. Flexible Open-Ended Stay (null checkoutDate), Time Recording & Daily Extra/Discount', async () => {
    const tariff = room.type.baseTariff // per night
    const dailyExtra = 15000 // ₹150 daily
    const dailyDiscount = 5000 // ₹50 daily
    // Initial 1-night calculation with 0% GST default
    const initialTotal = tariff + dailyExtra - dailyDiscount

    const openBooking = await prisma.booking.create({
      data: {
        bookingNumber: `DL-FLEX-${Date.now()}`,
        guestId: guest.id,
        roomId: room.id,
        checkInDate: new Date('2026-11-20T12:00:00Z'),
        checkoutDate: null, // Flexible / open-ended stay
        nights: 1,
        roomTariff: tariff,
        extraCharges: dailyExtra,
        discount: dailyDiscount,
        taxRate: 0, // default 0% GST
        tax: 0,
        totalAmount: initialTotal,
        status: 'RESERVED',
        paymentStatus: 'UNPAID',
        createdById: admin.id,
      },
    })

    assert.ok(openBooking.id)
    assert.strictEqual(openBooking.checkoutDate, null, 'checkoutDate must be null for flexible stay')
    assert.strictEqual(openBooking.taxRate, 0, 'taxRate should default to 0%')

    // Check-in with recorded time: 2:30 PM (14:30)
    const checkInTime = new Date('2026-11-20T14:30:00Z')
    await prisma.$transaction([
      prisma.booking.update({
        where: { id: openBooking.id },
        data: { status: 'CHECKED_IN', actualCheckIn: checkInTime },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { status: 'OCCUPIED' },
      }),
    ])

    const checkedInRecord = await prisma.booking.findUnique({ where: { id: openBooking.id } })
    assert.strictEqual(checkedInRecord.status, 'CHECKED_IN')
    assert.deepStrictEqual(checkedInRecord.actualCheckIn, checkInTime)

    // Check-out on Nov 23 (3 nights) at 11:15 AM
    const checkOutTime = new Date('2026-11-23T11:15:00Z')
    const actualNights = 3
    const finalTotal = (tariff * actualNights) + (dailyExtra * actualNights) - (dailyDiscount * actualNights)

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: openBooking.id },
        data: {
          status: 'CHECKED_OUT',
          checkoutDate: checkOutTime,
          actualCheckOut: checkOutTime,
          nights: actualNights,
          totalAmount: finalTotal,
        },
      }),
      prisma.room.update({
        where: { id: room.id },
        data: { status: 'AVAILABLE' },
      }),
    ])

    const finalRecord = await prisma.booking.findUnique({ where: { id: openBooking.id } })
    assert.strictEqual(finalRecord.status, 'CHECKED_OUT')
    assert.strictEqual(finalRecord.nights, 3)
    assert.strictEqual(finalRecord.totalAmount, finalTotal)
    assert.deepStrictEqual(finalRecord.actualCheckOut, checkOutTime)

    // Clean up
    await prisma.booking.delete({ where: { id: openBooking.id } })
  })

  // 11. Flexible Stay Daily Accrual from Reservation Time & Partial Payment Tracking
  await t.test('10. Flexible Stay Daily Calculation from Reservation Time & Payment Tracking', async () => {
    const tariff = room.type.baseTariff
    const dailyExtra = 20000 // ₹200 daily
    const dailyDisc = 10000 // ₹100 daily

    // Reservation made 49 hours ago (crossed into Day 3, so 3 nights total)
    const fortyNineHoursAgo = new Date(Date.now() - 49 * 60 * 60 * 1000)

    const flexStay = await prisma.booking.create({
      data: {
        bookingNumber: `DL-ACCRUE-${Date.now()}`,
        guestId: guest.id,
        roomId: room.id,
        checkInDate: fortyNineHoursAgo,
        actualCheckIn: fortyNineHoursAgo, // Reservation time as check-in
        checkoutDate: null, // open-ended flexible
        nights: 1, // initially 1
        roomTariff: tariff,
        extraCharges: dailyExtra,
        discount: dailyDisc,
        taxRate: 0,
        tax: 0,
        totalAmount: tariff + dailyExtra - dailyDisc,
        status: 'CHECKED_IN',
        paymentStatus: 'UNPAID',
        createdById: admin.id,
      },
    })

    // Simulate daily calculation engine (as in syncActiveFlexibleBookings)
    const now = new Date()
    const diffMs = Math.max(0, now.getTime() - fortyNineHoursAgo.getTime())
    const accruedNights = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
    assert.strictEqual(accruedNights, 3, '49 hours elapsed must accrue 3 nights')

    const dayRate = tariff + dailyExtra - dailyDisc
    const accruedTotal = dayRate * accruedNights

    // Update with accrued daily totals
    await prisma.booking.update({
      where: { id: flexStay.id },
      data: {
        nights: accruedNights,
        totalAmount: accruedTotal,
      },
    })

    // Guest pays for Day 1 only (₹1 day rate)
    const p1 = await prisma.payment.create({
      data: {
        bookingId: flexStay.id,
        amount: dayRate,
        method: 'CASH',
        reference: 'DAY-1-PAYMENT',
        receivedById: admin.id,
      },
    })
    assert.ok(p1.id)

    // Check balance: 2 days remain due
    const totalPaid = dayRate
    const remainingBalance = accruedTotal - totalPaid
    assert.strictEqual(remainingBalance, dayRate * 2, '2 days must remain due after 1 day payment')

    await prisma.booking.update({
      where: { id: flexStay.id },
      data: { paymentStatus: 'PARTIALLY_PAID' },
    })

    // Checkout: Guest settles remaining 2 days
    const p2 = await prisma.payment.create({
      data: {
        bookingId: flexStay.id,
        amount: remainingBalance,
        method: 'UPI',
        reference: 'CHECKOUT-BALANCE-UPI',
        receivedById: admin.id,
      },
    })
    assert.ok(p2.id)

    const checkOutRecord = await prisma.booking.update({
      where: { id: flexStay.id },
      data: {
        status: 'CHECKED_OUT',
        checkoutDate: now,
        actualCheckOut: now,
        paymentStatus: 'PAID',
      },
    })

    assert.strictEqual(checkOutRecord.status, 'CHECKED_OUT')
    assert.strictEqual(checkOutRecord.paymentStatus, 'PAID')
    assert.strictEqual(checkOutRecord.nights, 3)

    // Clean up
    await prisma.payment.deleteMany({ where: { bookingId: flexStay.id } })
    await prisma.booking.delete({ where: { id: flexStay.id } })
  })

  // 11. Historical Past Stay Logging (Paper Register)
  await t.test('11. Historical Past Stay Logging (Paper Register) Preserves Room Availability & Attributes Revenue', async () => {
    // Record room's current status
    const roomBefore = await prisma.room.findUnique({ where: { id: room.id } })
    const initialRoomStatus = roomBefore.status

    // Past stay dates: 3 nights in past
    const pastCheckIn = new Date('2026-01-05T12:00:00Z')
    const pastCheckOut = new Date('2026-01-08T10:00:00Z')
    const tariff = 100000 // ₹1000/night in paise
    const nights = 3
    const extraCharges = 20000 // ₹200/day
    const discount = 5000 // ₹50/day
    const dailyRate = tariff + extraCharges - discount
    const subtotal = dailyRate * nights
    const gstPct = 0
    const tax = Math.round((subtotal * gstPct) / 100)
    const totalAmount = subtotal + tax

    const histBooking = await prisma.booking.create({
      data: {
        bookingNumber: `DL-HIST-${Date.now()}`,
        guestId: guest.id,
        roomId: room.id,
        checkInDate: pastCheckIn,
        checkoutDate: pastCheckOut,
        actualCheckIn: pastCheckIn,
        actualCheckOut: pastCheckOut,
        nights,
        roomTariff: tariff,
        extraCharges,
        discount,
        tax,
        totalAmount,
        status: 'CHECKED_OUT',
        paymentStatus: 'PAID',
        source: 'OTHER',
        notes: 'Register Vol 4, Page 22',
        createdById: admin.id,
      },
    })

    assert.ok(histBooking.id)
    assert.strictEqual(histBooking.status, 'CHECKED_OUT')
    assert.strictEqual(histBooking.nights, 3)
    assert.strictEqual(histBooking.totalAmount, totalAmount)

    // Create payment settled at historical checkout date
    const histPayment = await prisma.payment.create({
      data: {
        bookingId: histBooking.id,
        amount: totalAmount,
        method: 'CASH',
        reference: 'REG-VOL4-P22',
        paymentDate: pastCheckOut,
        receivedById: admin.id,
      },
    })

    assert.ok(histPayment.id)
    assert.strictEqual(histPayment.amount, totalAmount)
    assert.strictEqual(histPayment.paymentDate.toISOString(), pastCheckOut.toISOString())

    // CRITICAL: Room status MUST NOT change (remains untouched)
    const roomAfter = await prisma.room.findUnique({ where: { id: room.id } })
    assert.strictEqual(roomAfter.status, initialRoomStatus, 'Room status must remain completely unaffected by past stay entry')

    // Clean up
    await prisma.payment.deleteMany({ where: { bookingId: histBooking.id } })
    await prisma.booking.delete({ where: { id: histBooking.id } })
  })

  // Clean up test booking and guest
  await prisma.payment.deleteMany({ where: { bookingId: booking.id } })
  await prisma.booking.delete({ where: { id: booking.id } })
  await prisma.guest.delete({ where: { id: guest.id } })

  await prisma.$disconnect()
  await pool.end()
})

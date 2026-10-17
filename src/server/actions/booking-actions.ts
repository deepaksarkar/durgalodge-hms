// src/server/actions/booking-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { BookingStatus, PaymentStatus, BookingSource, PaymentMethod, Role } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { requireAuth } from '@/lib/auth'
import { calculateBookingTotals, calculateBalance } from '@/lib/booking-calculator'
import { hasDateOverlap, combineDateAndTime, formatInputDate } from '@/lib/date-utils'
import { getLiveKolkataTime, calculateStayNights } from '@/lib/kolkata-time'
import { rupeesToPaise } from '@/lib/currency'

const createBookingSchema = z.object({
  // Guest: either existing or new
  guestId: z.string().optional(),
  newGuest: z
    .object({
      fullName: z.string().min(2, 'Guest name is required'),
      phone: z.string().min(10, 'Valid 10-digit phone number is required'),
      email: z.string().email().optional().or(z.literal('')),
      city: z.string().optional(),
      state: z.string().optional(),
      idType: z.string().optional(),
      idNumber: z.string().optional(),
    })
    .optional(),
  roomId: z.string().uuid('Please select a valid room'),
  checkInDate: z.string(), // ISO string YYYY-MM-DD
  checkInTime: z.string().optional(), // HH:mm
  checkoutDate: z.string().optional().nullable().or(z.literal('')), // Optional: null/empty for flexible / open-ended stay
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  roomTariff: z.number().positive(), // in Rupees per night
  extraCharges: z.number().min(0).default(0), // in Rupees per day (daily)
  discount: z.number().min(0).default(0), // in Rupees per day (daily)
  gstPercentage: z.number().min(0).max(100).default(0), // Default GST is 0%
  source: z.nativeEnum(BookingSource).default('WALK_IN'),
  notes: z.string().optional(),
  // Optional Advance Payment
  advancePayment: z
    .object({
      amount: z.number().positive(),
      method: z.nativeEnum(PaymentMethod),
      reference: z.string().optional(),
    })
    .optional(),
})

const createHistoricalBookingSchema = z.object({
  guestId: z.string().optional(),
  newGuest: z
    .object({
      fullName: z.string().min(2, 'Guest name is required'),
      phone: z.string().min(10, 'Valid 10-digit phone number is required'),
      email: z.string().email().optional().or(z.literal('')),
      city: z.string().optional(),
      state: z.string().optional(),
      idType: z.string().optional(),
      idNumber: z.string().optional(),
    })
    .optional(),
  roomId: z.string().uuid('Please select a valid room'),
  checkInDate: z.string(), // YYYY-MM-DD
  checkInTime: z.string().optional(), // HH:mm
  checkoutDate: z.string(), // YYYY-MM-DD
  checkOutTime: z.string().optional(), // HH:mm
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  roomTariff: z.number().positive(), // in Rupees per night
  extraCharges: z.number().min(0).default(0), // in Rupees per day (daily)
  discount: z.number().min(0).default(0), // in Rupees per day (daily)
  gstPercentage: z.number().min(0).max(100).default(0),
  source: z.nativeEnum(BookingSource).default('WALK_IN'),
  notes: z.string().optional(),
  amountPaid: z.number().min(0).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default('CASH'),
  paymentReference: z.string().optional(),
})

const checkInSchema = z.object({
  bookingId: z.string().uuid(),
  checkInDate: z.string().optional(), // YYYY-MM-DD
  checkInTime: z.string().optional(), // HH:mm
  notes: z.string().optional(),
})

const checkOutSchema = z.object({
  bookingId: z.string().uuid(),
  checkOutDate: z.string().optional(), // YYYY-MM-DD
  checkOutTime: z.string().optional(), // HH:mm
  settleBalance: z.boolean().default(false),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
})

const addPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().positive('Payment amount must be greater than 0'), // in Rupees
  method: z.nativeEnum(PaymentMethod),
  reference: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * Fetch list of bookings with filtering, search, and pagination
 */
export async function getBookings(params: {
  status?: BookingStatus | 'ALL'
  paymentStatus?: PaymentStatus | 'ALL'
  roomId?: string
  search?: string
  limit?: number
  page?: number
} = {}) {
  await requireAuth()
  const limit = params.limit || 25
  const page = params.page || 1
  const skip = (page - 1) * limit

  const where: any = {}

  if (params.status && params.status !== 'ALL') {
    where.status = params.status
  }

  if (params.paymentStatus && params.paymentStatus !== 'ALL') {
    where.paymentStatus = params.paymentStatus
  }

  if (params.roomId) {
    where.roomId = params.roomId
  }

  if (params.search && params.search.trim() !== '') {
    const s = params.search.trim()
    where.OR = [
      { bookingNumber: { contains: s, mode: 'insensitive' } },
      { guest: { fullName: { contains: s, mode: 'insensitive' } } },
      { guest: { phone: { contains: s } } },
      { room: { number: { contains: s } } },
    ]
  }

  const [totalCount, bookings] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      include: {
        guest: true,
        room: { include: { type: true } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
  ])

  return {
    bookings,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    page,
    limit,
  }
}

/**
 * Get single booking with all relations
 */
export async function getBookingById(id: string) {
  await requireAuth()
  return await prisma.booking.findUnique({
    where: { id },
    include: {
      guest: true,
      room: { include: { type: true } },
      payments: {
        include: { receivedBy: { select: { name: true, role: true } } },
        orderBy: { paymentDate: 'desc' },
      },
      createdBy: { select: { name: true, email: true } },
      checkInUser: { select: { name: true, email: true } },
    },
  })
}

/**
 * Helper to generate human-readable reference: DL-YYYYMMDD-XXXX
 */
function generateBookingReference(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `DL-${y}${m}${day}-${rand}`
}

/**
 * Create a new Booking with atomic double-booking protection
 */
export async function createBooking(data: z.infer<typeof createBookingSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = createBookingSchema.parse(data)
  const liveTime = await getLiveKolkataTime()

  // Take reservation time as checkin:
  // If user provided a specific checkInTime, combine with checkInDate.
  // Otherwise, take current live time from Kolkata Time API.
  const checkIn = parsed.checkInTime
    ? combineDateAndTime(parsed.checkInDate, parsed.checkInTime)
    : (parsed.checkInDate === liveTime.dateString || !parsed.checkInDate
        ? liveTime.date
        : combineDateAndTime(parsed.checkInDate, liveTime.timeString))

  let checkout: Date | null = null
  let nights = 1

  if (parsed.checkoutDate && parsed.checkoutDate.trim() !== '') {
    checkout = combineDateAndTime(parsed.checkoutDate, '11:00')
    if (checkout <= checkIn) {
      throw new Error('Checkout date must be after check-in date')
    }
    nights = calculateStayNights(checkIn, checkout)
  }

  // GST rate: default is 0% as requested! Option to edit GST percentage provided in form
  const taxPercentage = Math.round((parsed.gstPercentage ?? 0) * 100) // in basis points

  // Financial calculation in integer paise (extra charges and discount applied daily)
  const roomTariffPaise = rupeesToPaise(parsed.roomTariff)
  const extraChargesPaise = rupeesToPaise(parsed.extraCharges)
  const discountPaise = rupeesToPaise(parsed.discount)

  const calculation = calculateBookingTotals({
    roomTariff: roomTariffPaise,
    nights,
    extraCharges: extraChargesPaise,
    discount: discountPaise,
    taxPercentage,
  })

  // Execute inside transactional boundary
  const result = await prisma.$transaction(async (tx) => {
    // 1. Double-booking conflict check
    const activeBookings = await tx.booking.findMany({
      where: {
        roomId: parsed.roomId,
        status: { in: ['RESERVED', 'CHECKED_IN'] },
      },
      include: { guest: true, room: true },
    })

    const conflictingBookings = activeBookings.filter((existing) => {
      return hasDateOverlap(checkIn, checkout, existing.checkInDate, existing.checkoutDate)
    })

    if (conflictingBookings.length > 0) {
      const conflict = conflictingBookings[0]
      const confOut = conflict.checkoutDate ? conflict.checkoutDate.toISOString().split('T')[0] : 'Indefinite'
      throw new Error(
        `Room conflict: Room ${conflict.room.number} is already booked for ${conflict.guest.fullName} from ${conflict.checkInDate.toISOString().split('T')[0]} to ${confOut}. Double-booking prevented.`
      )
    }

    // 2. Resolve Guest
    let guestId = parsed.guestId
    if (!guestId && parsed.newGuest) {
      // Check if phone already registered
      let guest = await tx.guest.findUnique({ where: { phone: parsed.newGuest.phone } })
      if (!guest) {
        guest = await tx.guest.create({
          data: {
            fullName: parsed.newGuest.fullName,
            phone: parsed.newGuest.phone,
            email: parsed.newGuest.email || null,
            city: parsed.newGuest.city || null,
            state: parsed.newGuest.state || null,
            idType: parsed.newGuest.idType || null,
            idNumber: parsed.newGuest.idNumber || null,
          },
        })
      }
      guestId = guest.id
    }

    if (!guestId) {
      throw new Error('Guest details are required')
    }

    // 3. Create Booking
    const isFlexible = !checkout
    const bookingNumber = generateBookingReference()
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        guestId,
        roomId: parsed.roomId,
        checkInDate: checkIn,
        checkoutDate: checkout,
        actualCheckIn: isFlexible ? checkIn : null, // Record reservation time as check-in for flexible stays
        adults: parsed.adults,
        children: parsed.children,
        roomTariff: roomTariffPaise,
        nights,
        extraCharges: extraChargesPaise, // stored daily
        discount: discountPaise,         // stored daily
        taxRate: taxPercentage,
        tax: calculation.tax,
        totalAmount: calculation.totalAmount,
        source: parsed.source,
        status: isFlexible ? 'CHECKED_IN' : 'RESERVED',
        paymentStatus: 'UNPAID',
        notes: parsed.notes,
        createdById: session.userId,
      },
    })

    // 4. Update room status: OCCUPIED if flexible stay, or RESERVED if fixed future reservation
    const currentRoom = await tx.room.findUnique({ where: { id: parsed.roomId } })
    if (currentRoom?.status === 'AVAILABLE') {
      await tx.room.update({
        where: { id: parsed.roomId },
        data: { status: isFlexible ? 'OCCUPIED' : 'RESERVED' },
      })
    }

    // 5. Handle Advance Payment if provided
    if (parsed.advancePayment && parsed.advancePayment.amount > 0) {
      const advancePaise = rupeesToPaise(parsed.advancePayment.amount)
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: advancePaise,
          method: parsed.advancePayment.method,
          reference: parsed.advancePayment.reference,
          notes: 'Advance deposit during booking',
          receivedById: session.userId,
        },
      })

      const paymentStatus = advancePaise >= calculation.totalAmount ? 'PAID' : 'PARTIALLY_PAID'
      await tx.booking.update({
        where: { id: booking.id },
        data: { paymentStatus },
      })
    }

    // 6. Audit Trail
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'BOOKING_CREATED',
        entity: 'Booking',
        entityId: booking.id,
        metadata: {
          bookingNumber,
          room: currentRoom?.number,
          totalAmount: calculation.totalAmount,
          nights,
        },
      },
    })

    return booking
  })

  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  return { success: true, booking: result }
}

/**
 * Create a Historical / Past Booking (from physical paper registers).
 * Saves as completed stay (CHECKED_OUT) with historical payment records.
 * Does NOT alter the room's current live availability status.
 */
export async function createHistoricalBooking(data: z.infer<typeof createHistoricalBookingSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = createHistoricalBookingSchema.parse(data)

  const checkIn = combineDateAndTime(parsed.checkInDate, parsed.checkInTime || '12:00')
  const checkout = combineDateAndTime(parsed.checkoutDate, parsed.checkOutTime || '11:00')

  if (checkout <= checkIn) {
    throw new Error('Check-out date must be after check-in date')
  }

  const nights = calculateStayNights(checkIn, checkout)
  const taxPercentage = Math.round((parsed.gstPercentage ?? 0) * 100) // in basis points

  const roomTariffPaise = rupeesToPaise(parsed.roomTariff)
  const extraChargesPaise = rupeesToPaise(parsed.extraCharges)
  const discountPaise = rupeesToPaise(parsed.discount)

  const calculation = calculateBookingTotals({
    roomTariff: roomTariffPaise,
    nights,
    extraCharges: extraChargesPaise,
    discount: discountPaise,
    taxPercentage,
  })

  const result = await prisma.$transaction(async (tx) => {
    // 1. Conflict check against other bookings on the same room for overlapping dates
    const existingBookings = await tx.booking.findMany({
      where: {
        roomId: parsed.roomId,
        status: { in: ['RESERVED', 'CHECKED_IN', 'CHECKED_OUT'] },
      },
      include: { guest: true, room: true },
    })

    const conflicting = existingBookings.filter((existing) => {
      return hasDateOverlap(checkIn, checkout, existing.checkInDate, existing.checkoutDate)
    })

    if (conflicting.length > 0) {
      const c = conflicting[0]
      const cOut = c.checkoutDate ? c.checkoutDate.toISOString().split('T')[0] : 'Indefinite'
      throw new Error(
        `Date conflict: Room ${c.room.number} already has a record (${c.bookingNumber} - ${c.guest.fullName}) from ${c.checkInDate.toISOString().split('T')[0]} to ${cOut}.`
      )
    }

    // 2. Resolve Guest
    let guestId = parsed.guestId
    if (!guestId && parsed.newGuest) {
      let guest = await tx.guest.findUnique({ where: { phone: parsed.newGuest.phone } })
      if (!guest) {
        guest = await tx.guest.create({
          data: {
            fullName: parsed.newGuest.fullName,
            phone: parsed.newGuest.phone,
            email: parsed.newGuest.email || null,
            city: parsed.newGuest.city || null,
            state: parsed.newGuest.state || null,
            idType: parsed.newGuest.idType || null,
            idNumber: parsed.newGuest.idNumber || null,
          },
        })
      }
      guestId = guest.id
    }

    if (!guestId) {
      throw new Error('Guest details are required')
    }

    // 3. Payment amount calculation
    const amountPaidPaise = parsed.amountPaid !== undefined
      ? rupeesToPaise(parsed.amountPaid)
      : calculation.totalAmount

    let paymentStatus: PaymentStatus = 'UNPAID'
    if (amountPaidPaise >= calculation.totalAmount && calculation.totalAmount > 0) {
      paymentStatus = 'PAID'
    } else if (amountPaidPaise > 0) {
      paymentStatus = 'PARTIALLY_PAID'
    }

    // 4. Create Historical Booking
    const bookingNumber = generateBookingReference()
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        guestId,
        roomId: parsed.roomId,
        checkInDate: checkIn,
        checkoutDate: checkout,
        actualCheckIn: checkIn,
        actualCheckOut: checkout,
        adults: parsed.adults,
        children: parsed.children,
        roomTariff: roomTariffPaise,
        nights,
        extraCharges: extraChargesPaise, // daily
        discount: discountPaise,         // daily
        taxRate: taxPercentage,
        tax: calculation.tax,
        totalAmount: calculation.totalAmount,
        source: parsed.source,
        status: 'CHECKED_OUT', // Historical completed stay
        paymentStatus,
        notes: parsed.notes ? `${parsed.notes} [Register Archive]`.trim() : '[Register Archive]',
        createdById: session.userId,
        checkInUserId: session.userId,
      },
    })

    // 5. Create Payment record on the historical settlement date
    if (amountPaidPaise > 0) {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: amountPaidPaise,
          method: parsed.paymentMethod,
          reference: parsed.paymentReference || 'Register Settlement',
          paymentDate: checkout, // Attributed to historical checkout date
          notes: 'Settlement from physical register book',
          receivedById: session.userId,
        },
      })
    }

    // 6. Audit Trail (Room live status is intentionally NOT altered!)
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'HISTORICAL_BOOKING_LOGGED',
        entity: 'Booking',
        entityId: booking.id,
        metadata: {
          bookingNumber,
          stayPeriod: `${parsed.checkInDate} to ${parsed.checkoutDate}`,
          nights,
          totalAmount: calculation.totalAmount,
          amountPaid: amountPaidPaise,
        },
      },
    })

    return booking
  })

  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/reports')
  revalidatePath('/revenue')
  revalidatePath('/dashboard')
  revalidatePath('/guests')
  return { success: true, booking: result }
}

/**
 * Check-In Guest workflow
 */
export async function checkInBooking(data: z.infer<typeof checkInSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = checkInSchema.parse(data)
  const liveTime = await getLiveKolkataTime()

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: parsed.bookingId },
      include: { room: true, guest: true },
    })

    if (!booking) throw new Error('Booking not found')
    if (booking.status !== 'RESERVED') {
      throw new Error(`Cannot check-in booking in ${booking.status} status`)
    }

    const checkInTimestamp = parsed.checkInTime
      ? combineDateAndTime(parsed.checkInDate || liveTime.dateString, parsed.checkInTime)
      : liveTime.date

    // 1. Update Booking
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CHECKED_IN',
        actualCheckIn: checkInTimestamp,
        checkInUserId: session.userId,
        notes: parsed.notes ? `${booking.notes || ''}\n${parsed.notes}`.trim() : booking.notes,
      },
    })

    // 2. Update Room to OCCUPIED
    await tx.room.update({
      where: { id: booking.roomId },
      data: { status: 'OCCUPIED' },
    })

    // 3. Audit Log
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CHECK_IN',
        entity: 'Booking',
        entityId: booking.id,
        metadata: {
          bookingNumber: booking.bookingNumber,
          roomNumber: booking.room.number,
          guest: booking.guest.fullName,
          actualCheckIn: checkInTimestamp.toISOString(),
        },
      },
    })

    return updatedBooking
  })

  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/check-ins')
  revalidatePath('/dashboard')
  return { success: true, booking: result }
}

/**
 * Check-Out Guest workflow with balance settlement, time recording, & dynamic stay duration calculation
 */
export async function checkOutBooking(data: z.infer<typeof checkOutSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = checkOutSchema.parse(data)
  const liveTime = await getLiveKolkataTime()

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: parsed.bookingId },
      include: { room: true, guest: true, payments: true },
    })

    if (!booking) throw new Error('Booking not found')
    if (booking.status !== 'CHECKED_IN') {
      throw new Error(`Cannot check-out booking in ${booking.status} status`)
    }

    const checkOutTimestamp = parsed.checkOutTime
      ? combineDateAndTime(parsed.checkOutDate || liveTime.dateString, parsed.checkOutTime)
      : liveTime.date

    // Dynamic duration calculation: take reservation time as check-in, count total nights till checkout
    const effectiveCheckIn = booking.actualCheckIn || booking.createdAt || booking.checkInDate
    const actualNights = calculateStayNights(effectiveCheckIn, checkOutTimestamp)

    // Recalculate totals with actual duration (extra charges and discount applied daily)
    const calculation = calculateBookingTotals({
      roomTariff: booking.roomTariff,
      nights: actualNights,
      extraCharges: booking.extraCharges, // stored daily
      discount: booking.discount,         // stored daily
      taxPercentage: booking.taxRate || 0,
    })

    // Calculate balance based on recalculated total
    const { totalPaid, balance } = calculateBalance(calculation.totalAmount, booking.payments)

    // If balance remains and settlement is requested
    if (balance > 0 && parsed.settleBalance && parsed.paymentMethod) {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: balance,
          method: parsed.paymentMethod,
          reference: parsed.paymentReference,
          notes: `Checkout balance settlement for ${actualNights} nights`,
          receivedById: session.userId,
        },
      })
    } else if (balance > 0 && !parsed.settleBalance) {
      // Check hotel policy
      const setting = await tx.hotelSetting.findUnique({ where: { id: 'durga-lodge-settings' } })
      if (!setting?.allowNegativeBalanceCheckout && session.role !== Role.ADMIN) {
        throw new Error(
          `Outstanding balance of ₹${(balance / 100).toFixed(2)} must be settled before checkout or authorized by Admin.`
        )
      }
    }

    // 1. Update Booking to CHECKED_OUT with final dates and recalculated amounts
    const updatedBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CHECKED_OUT',
        checkoutDate: checkOutTimestamp,
        actualCheckOut: checkOutTimestamp,
        nights: actualNights,
        tax: calculation.tax,
        totalAmount: calculation.totalAmount,
        paymentStatus: balance === 0 || parsed.settleBalance ? 'PAID' : (totalPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID'),
        notes: parsed.notes ? `${booking.notes || ''}\nCheckout note: ${parsed.notes}`.trim() : booking.notes,
      },
    })

    // 2. Set Room to CLEANING
    await tx.room.update({
      where: { id: booking.roomId },
      data: { status: 'CLEANING' },
    })

    // 3. Audit Log
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'CHECK_OUT',
        entity: 'Booking',
        entityId: booking.id,
        metadata: {
          bookingNumber: booking.bookingNumber,
          roomNumber: booking.room.number,
          guest: booking.guest.fullName,
          balanceRemaining: balance > 0 && !parsed.settleBalance ? balance : 0,
        },
      },
    })

    return updatedBooking
  })

  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/check-outs')
  revalidatePath('/dashboard')
  return { success: true, booking: result }
}

/**
 * Add a payment to a booking
 */
export async function addPaymentToBooking(data: z.infer<typeof addPaymentSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = addPaymentSchema.parse(data)
  // Ensure flexible booking is up-to-date with live Time API before recording payment
  await syncActiveFlexibleBookings(parsed.bookingId)

  const amountPaise = rupeesToPaise(parsed.amount)

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: parsed.bookingId },
      include: { payments: true },
    })

    if (!booking) throw new Error('Booking not found')

    // Create payment
    const payment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: amountPaise,
        method: parsed.method,
        reference: parsed.reference,
        notes: parsed.notes,
        receivedById: session.userId,
      },
    })

    // Recalculate status
    const allPayments = [...booking.payments, payment]
    const { paymentStatus } = calculateBalance(booking.totalAmount, allPayments)

    await tx.booking.update({
      where: { id: booking.id },
      data: { paymentStatus },
    })

    // Audit Log
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'PAYMENT_ADDED',
        entity: 'Payment',
        entityId: payment.id,
        metadata: {
          bookingNumber: booking.bookingNumber,
          amount: amountPaise,
          method: parsed.method,
        },
      },
    })

    return payment
  })

  revalidatePath('/bookings')
  revalidatePath('/payments')
  revalidatePath('/dashboard')
  return { success: true, payment: result }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string, reason?: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { room: true },
    })

    if (!booking) throw new Error('Booking not found')
    if (booking.status === 'CHECKED_OUT') {
      throw new Error('Completed bookings cannot be cancelled')
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${booking.notes || ''}\nCancellation reason: ${reason}`.trim() : booking.notes,
      },
    })

    // If room is reserved for this booking, return room to AVAILABLE
    if (booking.room.status === 'RESERVED' || booking.room.status === 'OCCUPIED') {
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'AVAILABLE' },
      })
    }

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'BOOKING_CANCELLED',
        entity: 'Booking',
        entityId: booking.id,
        metadata: { bookingNumber: booking.bookingNumber, reason },
      },
    })

    return updated
  })

  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  return { success: true, booking: result }
}

/**
 * Delete a booking / reservation (Admin only)
 * Automatically removes all associated payment records, frees room if occupied/reserved, and logs audit
 */
export async function deleteBooking(bookingId: string) {
  const session = await getSession()
  if (!session || session.role !== Role.ADMIN) {
    throw new Error('Permission denied: Only Admin can delete reservations')
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { room: true, payments: true },
  })

  if (!booking) throw new Error('Booking not found')

  await prisma.$transaction(async (tx) => {
    // 1. Delete all payments associated with this booking
    await tx.payment.deleteMany({
      where: { bookingId },
    })

    // 2. If room is reserved or occupied by this booking, reset room to AVAILABLE
    if (booking.room.status === 'RESERVED' || booking.room.status === 'OCCUPIED') {
      await tx.room.update({
        where: { id: booking.roomId },
        data: { status: 'AVAILABLE' },
      })
    }

    // 3. Delete the booking
    await tx.booking.delete({
      where: { id: bookingId },
    })

    // 4. Record audit log
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'BOOKING_DELETED',
        entity: 'Booking',
        entityId: bookingId,
        metadata: {
          bookingNumber: booking.bookingNumber,
          guestId: booking.guestId,
          roomId: booking.roomId,
          paymentsDeletedCount: booking.payments.length,
        },
      },
    })
  })

  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  revalidatePath('/payments')
  revalidatePath('/revenue')
  return { success: true }
}

/**
 * Synchronizes all active flexible (open-ended) bookings with real-time Asia/Kolkata clock.
 * Fetches date & time from https://timeapi.io/api/Time/current/zone?timeZone=Asia/Kolkata
 * Takes reservation time as check-in anchor, counts accrued nights, and calculates daily bill.
 */
export async function syncActiveFlexibleBookings(specificBookingId?: string, shouldRevalidate: boolean = false) {
  try {
    await requireAuth()
    const liveTime = await getLiveKolkataTime()
    const now = liveTime.date

    const where: any = {
      checkoutDate: null,
      status: { in: ['RESERVED', 'CHECKED_IN'] },
    }
    if (specificBookingId) {
      where.id = specificBookingId
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: { payments: true },
    })

    for (const b of bookings) {
      const startTime = b.actualCheckIn || b.createdAt || b.checkInDate
      const calculatedNights = calculateStayNights(startTime, now)

      const totals = calculateBookingTotals({
        roomTariff: b.roomTariff,
        nights: calculatedNights,
        extraCharges: b.extraCharges, // stored daily
        discount: b.discount,         // stored daily
        taxPercentage: b.taxRate || 0,
      })

      const paid = b.payments.reduce((acc, p) => (p.isRefund ? acc - p.amount : acc + p.amount), 0)
      let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED' = 'UNPAID'
      if (paid >= totals.totalAmount && totals.totalAmount > 0) {
        paymentStatus = 'PAID'
      } else if (paid > 0) {
        paymentStatus = 'PARTIALLY_PAID'
      } else {
        paymentStatus = 'UNPAID'
      }

      if (
        b.nights !== calculatedNights ||
        b.totalAmount !== totals.totalAmount ||
        b.paymentStatus !== paymentStatus
      ) {
        await prisma.booking.update({
          where: { id: b.id },
          data: {
            nights: calculatedNights,
            tax: totals.tax,
            totalAmount: totals.totalAmount,
            paymentStatus,
          },
        })
      }
    }

    if (shouldRevalidate) {
      revalidatePath('/bookings')
      revalidatePath('/check-outs')
      revalidatePath('/check-ins')
      revalidatePath('/payments')
      revalidatePath('/dashboard')
    }

    return {
      success: true,
      count: bookings.length,
      liveTime: liveTime.dateTimeString,
      source: liveTime.source,
    }
  } catch (err: any) {
    console.error('Error syncing flexible bookings with Time API:', err)
    return { success: false, error: err.message }
  }
}

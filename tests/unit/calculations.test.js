// tests/unit/calculations.test.js
const test = require('node:test')
const assert = require('node:assert')

// Replicate pure mathematical business logic from src/lib/booking-calculator.ts and src/lib/currency.ts
function formatCurrency(paise) {
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(rupees)
}

function rupeesToPaise(rupees) {
  const amount = typeof rupees === 'string' ? parseFloat(rupees) : rupees
  if (isNaN(amount)) return 0
  return Math.round(amount * 100)
}

function calculateBookingTotals(input) {
  const nights = Math.max(1, Math.floor(input.nights || 1))
  const tariff = Math.max(0, Math.round(input.roomTariff || 0))
  const roomCharges = tariff * nights

  const extraDaily = Math.max(0, Math.round(input.extraCharges || 0))
  const discDaily = Math.max(0, Math.round(input.discount || 0))

  const totalExtra = extraDaily * nights
  const totalDisc = discDaily * nights

  const netSubtotal = Math.max(0, roomCharges + totalExtra - totalDisc)
  const taxBasisPoints = Math.max(0, Math.round(input.taxPercentage || 0))
  const tax = taxBasisPoints > 0 ? Math.round((netSubtotal * taxBasisPoints) / 10000) : 0
  const totalAmount = netSubtotal + tax

  return {
    roomCharges,
    extraChargesDaily: extraDaily,
    discountDaily: discDaily,
    extraCharges: totalExtra,
    discount: totalDisc,
    taxableAmount: netSubtotal,
    tax,
    totalAmount,
  }
}

function calculateBalance(totalAmount, payments) {
  const totalPaid = payments.reduce((sum, p) => p.isRefund ? sum - p.amount : sum + p.amount, 0)
  const balance = Math.max(0, totalAmount - totalPaid)
  
  let paymentStatus = 'UNPAID'
  if (totalPaid <= 0 && payments.length > 0 && payments.some(p => p.isRefund)) {
    paymentStatus = 'REFUNDED'
  } else if (totalPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = 'PAID'
  } else if (totalPaid > 0) {
    paymentStatus = 'PARTIALLY_PAID'
  } else {
    paymentStatus = 'UNPAID'
  }

  return { totalPaid, balance, paymentStatus }
}

function calculateHotelMetrics(totalRevenue, roomsSold, availableRoomNights) {
  const adr = roomsSold > 0 ? Math.round(totalRevenue / roomsSold) : 0
  const revpar = availableRoomNights > 0 ? Math.round(totalRevenue / availableRoomNights) : 0
  const occupancy = availableRoomNights > 0 ? Number(((roomsSold / availableRoomNights) * 100).toFixed(1)) : 0
  return { adr, revpar, occupancy }
}

test('1. Currency Conversion & Formatting: Paise to INR', () => {
  assert.strictEqual(rupeesToPaise(1250), 125000)
  assert.strictEqual(rupeesToPaise('1250.50'), 125050)
  assert.strictEqual(rupeesToPaise(0), 0)
  
  const formatted = formatCurrency(125000)
  assert.ok(formatted.includes('1,250.00'), `Expected formatted currency to contain 1,250.00, got ${formatted}`)
})

test('2. Booking Totals Calculation Engine (Daily Extra & Daily Discount, 0% GST Default)', () => {
  // Case A: Default 0% GST with daily charges
  // 3 nights in Standard AC (₹1,400.00 / night = 140000 paise)
  // Daily Extra charges: ₹200.00/day (20000 paise/day) -> total 60000 paise (₹600)
  // Daily Discount: ₹100.00/day (10000 paise/day) -> total 30000 paise (₹300)
  // Tax default: 0% GST (0 basis points)
  const resultDefaultTax = calculateBookingTotals({
    roomTariff: 140000,
    nights: 3,
    extraCharges: 20000,
    discount: 10000,
    // taxPercentage omitted -> defaults to 0
  })

  // Room charges = 140000 * 3 = 420000 paise (₹4,200)
  assert.strictEqual(resultDefaultTax.roomCharges, 420000)
  // Total extra = 20000 * 3 = 60000 paise (₹600)
  assert.strictEqual(resultDefaultTax.extraCharges, 60000)
  // Total discount = 10000 * 3 = 30000 paise (₹300)
  assert.strictEqual(resultDefaultTax.discount, 30000)
  // Taxable subtotal = 420000 + 60000 - 30000 = 450000 paise (₹4,500)
  assert.strictEqual(resultDefaultTax.taxableAmount, 450000)
  // Default tax = 0
  assert.strictEqual(resultDefaultTax.tax, 0)
  // Total amount = 450000 paise (₹4,500)
  assert.strictEqual(resultDefaultTax.totalAmount, 450000)

  // Case B: Configurable GST (12% GST = 1200 basis points)
  const resultWithTax = calculateBookingTotals({
    roomTariff: 140000,
    nights: 3,
    extraCharges: 20000,
    discount: 10000,
    taxPercentage: 1200,
  })
  // 12% GST on 450000 = 54000 paise (₹540.00)
  assert.strictEqual(resultWithTax.tax, 54000)
  // Total = 450000 + 54000 = 504000 paise (₹5,040.00)
  assert.strictEqual(resultWithTax.totalAmount, 504000)
})

test('3. Balance & Payment Status Calculations', () => {
  const totalAmount = 350000 // ₹3,500.00 in paise

  // Case A: Unpaid
  const resUnpaid = calculateBalance(totalAmount, [])
  assert.strictEqual(resUnpaid.totalPaid, 0)
  assert.strictEqual(resUnpaid.balance, 350000)
  assert.strictEqual(resUnpaid.paymentStatus, 'UNPAID')

  // Case B: Partial payment (Advance ₹1,000 cash)
  const resPartial = calculateBalance(totalAmount, [{ amount: 100000 }])
  assert.strictEqual(resPartial.totalPaid, 100000)
  assert.strictEqual(resPartial.balance, 250000)
  assert.strictEqual(resPartial.paymentStatus, 'PARTIALLY_PAID')

  // Case C: Fully Paid with multiple payments (₹1,000 cash + ₹2,000 UPI + ₹500 cash)
  const resFull = calculateBalance(totalAmount, [
    { amount: 100000 },
    { amount: 200000 },
    { amount: 500000 }, // Over or full
  ])
  assert.strictEqual(resFull.balance, 0)
  assert.strictEqual(resFull.paymentStatus, 'PAID')
})

test('4. Hotel ADR, RevPAR, and Occupancy Metrics', () => {
  // 16 rooms over 30 days = 480 available room nights
  // 240 room nights sold
  // Room revenue = ₹3,60,000.00 (36000000 paise)
  const metrics = calculateHotelMetrics(36000000, 240, 480)

  // ADR = 36000000 / 240 = 150000 paise (₹1,500.00)
  assert.strictEqual(metrics.adr, 150000)
  // RevPAR = 36000000 / 480 = 75000 paise (₹750.00)
  assert.strictEqual(metrics.revpar, 75000)
  // Occupancy = 240 / 480 = 50.0%
  assert.strictEqual(metrics.occupancy, 50.0)
})

test('5. Stay Duration Night Counter: Reservation Time as Check-in Anchor', () => {
  function calculateStayNights(startTime, endTime) {
    const diffMs = Math.max(0, endTime.getTime() - startTime.getTime())
    return Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
  }

  const reservationCheckIn = new Date('2026-10-05T14:30:00Z')

  // Under 24h (e.g. 2 hours later): 1 night
  assert.strictEqual(calculateStayNights(reservationCheckIn, new Date('2026-10-05T16:30:00Z')), 1)

  // Exactly 24h later: 1 night
  assert.strictEqual(calculateStayNights(reservationCheckIn, new Date('2026-10-06T14:30:00Z')), 1)

  // 24h + 10 mins (crossed into day 2): 2 nights
  assert.strictEqual(calculateStayNights(reservationCheckIn, new Date('2026-10-06T14:40:00Z')), 2)

  // 48h + 30 mins (crossed into day 3): 3 nights
  assert.strictEqual(calculateStayNights(reservationCheckIn, new Date('2026-10-07T15:00:00Z')), 3)
})


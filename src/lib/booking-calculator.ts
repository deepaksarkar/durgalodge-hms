// src/lib/booking-calculator.ts

export interface CalculationInput {
  roomTariff: number      // in paise per night
  nights: number          // integer >= 1
  extraCharges?: number   // in paise PER NIGHT (daily)
  discount?: number       // in paise PER NIGHT (daily)
  taxPercentage?: number  // in basis points (e.g. 1200 = 12.00%, default 0)
}

export interface CalculationResult {
  roomCharges: number        // tariff * nights (paise)
  extraChargesDaily: number  // daily extra in paise
  discountDaily: number      // daily discount in paise
  extraCharges: number       // total extra for stay: extraChargesDaily * nights (paise)
  discount: number           // total discount for stay: discountDaily * nights (paise)
  taxableAmount: number      // (roomCharges + extraCharges - discount) (paise)
  tax: number                // tax in paise
  totalAmount: number        // taxableAmount + tax (paise)
}

/**
 * Server-side calculation engine avoiding floating point errors.
 * All monetary amounts are processed in integer paise.
 * Extra charges and discounts are applied daily (multiplied by number of nights).
 * Default GST tax rate is 0.
 */
export function calculateBookingTotals(input: CalculationInput): CalculationResult {
  const nights = Math.max(1, Math.floor(input.nights || 1))
  const tariff = Math.max(0, Math.round(input.roomTariff || 0))
  const roomCharges = tariff * nights

  const extraDaily = Math.max(0, Math.round(input.extraCharges || 0))
  const discDaily = Math.max(0, Math.round(input.discount || 0))

  const totalExtra = extraDaily * nights
  const totalDisc = discDaily * nights

  // Subtotal before tax
  const netSubtotal = Math.max(0, roomCharges + totalExtra - totalDisc)

  // Tax calculation in basis points (default: 0)
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

/**
 * Calculates payments, outstanding balance and payment status.
 */
export function calculateBalance(totalAmount: number, payments: { amount: number; isRefund?: boolean }[]) {
  const totalPaid = payments.reduce((sum, p) => {
    return p.isRefund ? sum - p.amount : sum + p.amount
  }, 0)

  const balance = Math.max(0, totalAmount - totalPaid)
  
  let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED' = 'UNPAID'
  if (totalPaid <= 0 && payments.length > 0 && payments.some(p => p.isRefund)) {
    paymentStatus = 'REFUNDED'
  } else if (totalPaid >= totalAmount && totalAmount > 0) {
    paymentStatus = 'PAID'
  } else if (totalPaid > 0) {
    paymentStatus = 'PARTIALLY_PAID'
  } else {
    paymentStatus = 'UNPAID'
  }

  return {
    totalPaid,
    balance,
    paymentStatus,
  }
}

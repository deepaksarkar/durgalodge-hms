// src/server/actions/dashboard-actions.ts
'use server'

import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { HOTEL_TIMEZONE } from '@/lib/date-utils'
import { requireAuth } from '@/lib/auth'

export type TimeRangeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export async function getDashboardData(options: {
  range?: TimeRangeFilter
  startDate?: string
  endDate?: string
} = {}) {
  await requireAuth()
  const range = options.range || 'today'
  const now = toZonedTime(new Date(), HOTEL_TIMEZONE)

  let start: Date
  let end: Date

  switch (range) {
    case 'yesterday':
      const y = subDays(now, 1)
      start = startOfDay(y)
      end = endOfDay(y)
      break
    case 'week':
      start = startOfWeek(now, { weekStartsOn: 1 }) // Monday
      end = endOfDay(now)
      break
    case 'month':
      start = startOfMonth(now)
      end = endOfDay(now)
      break
    case 'custom':
      start = options.startDate ? new Date(options.startDate) : startOfDay(now)
      end = options.endDate ? endOfDay(new Date(options.endDate)) : endOfDay(now)
      break
    case 'today':
    default:
      start = startOfDay(now)
      end = endOfDay(now)
      break
  }

  // 1. Room Status Counts (Real-time snapshot)
  const [totalRooms, availableRooms, occupiedRooms, cleaningRooms, maintenanceRooms, reservedRooms] = await Promise.all([
    prisma.room.count({ where: { isActive: true } }),
    prisma.room.count({ where: { isActive: true, status: 'AVAILABLE' } }),
    prisma.room.count({ where: { isActive: true, status: 'OCCUPIED' } }),
    prisma.room.count({ where: { isActive: true, status: 'CLEANING' } }),
    prisma.room.count({ where: { isActive: true, status: 'MAINTENANCE' } }),
    prisma.room.count({ where: { isActive: true, status: 'RESERVED' } }),
  ])

  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  // 2. Financial Metrics in Selected Period
  // Payments received in period
  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: start, lte: end },
    },
    include: { booking: true },
  })

  // Group payments by method
  const paymentsByMethod = {
    CASH: 0,
    UPI: 0,
    CARD: 0,
    BANK_TRANSFER: 0,
    OTHER: 0,
  }

  let totalCollectedPaise = 0
  for (const p of payments) {
    const amt = p.isRefund ? -p.amount : p.amount
    totalCollectedPaise += amt
    if (p.method in paymentsByMethod) {
      paymentsByMethod[p.method] += amt
    }
  }

  // Expenses in selected period
  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: start, lte: end },
    },
    include: { category: true },
  })

  let totalExpensesPaise = 0
  let cashExpensesPaise = 0
  for (const e of expenses) {
    totalExpensesPaise += e.amount
    if (e.method === 'CASH') {
      cashExpensesPaise += e.amount
    }
  }

  // Recognized Revenue in period (Bookings active or created in period)
  const bookingsInPeriod = await prisma.booking.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      createdAt: { gte: start, lte: end },
    },
  })

  const recognizedRevenuePaise = bookingsInPeriod.reduce((sum, b) => sum + b.totalAmount, 0)

  // Net Operating Result = Recognized Revenue - Expenses
  const netOperatingProfitPaise = recognizedRevenuePaise - totalExpensesPaise

  // Cash Flow = Cash received - cash expenses
  const cashFlowPaise = (paymentsByMethod.CASH || 0) - cashExpensesPaise

  // 3. Operational Counters for Selected Period
  const [checkInsCount, checkOutsCount, bookingsCreatedCount] = await Promise.all([
    prisma.booking.count({
      where: {
        actualCheckIn: { gte: start, lte: end },
      },
    }),
    prisma.booking.count({
      where: {
        actualCheckOut: { gte: start, lte: end },
      },
    }),
    prisma.booking.count({
      where: {
        createdAt: { gte: start, lte: end },
      },
    }),
  ])

  // Outstanding balances across all active bookings
  const activeBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['RESERVED', 'CHECKED_IN'] },
    },
    include: { payments: true },
  })

  let pendingPaymentsPaise = 0
  for (const b of activeBookings) {
    const paid = b.payments.reduce((acc, p) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
    if (b.totalAmount > paid) {
      pendingPaymentsPaise += (b.totalAmount - paid)
    }
  }

  // 4. Daily Trend Breakdown (Past 7 or 14 days)
  const trendDaysCount = range === 'month' ? 30 : 7
  const trendStartDate = subDays(endOfDay(now), trendDaysCount - 1)
  const trendInterval = eachDayOfInterval({ start: startOfDay(trendStartDate), end: endOfDay(now) })

  const [allRecentPayments, allRecentExpenses] = await Promise.all([
    prisma.payment.findMany({
      where: { paymentDate: { gte: trendStartDate, lte: endOfDay(now) } },
    }),
    prisma.expense.findMany({
      where: { date: { gte: trendStartDate, lte: endOfDay(now) } },
    }),
  ])

  const dailyTrends = trendInterval.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const displayLabel = format(day, 'dd MMM')

    const dayPayments = allRecentPayments.filter((p) => {
      const pDay = format(toZonedTime(p.paymentDate, HOTEL_TIMEZONE), 'yyyy-MM-dd')
      return pDay === dayStr
    })

    const dayExpenses = allRecentExpenses.filter((e) => {
      const eDay = format(toZonedTime(e.date, HOTEL_TIMEZONE), 'yyyy-MM-dd')
      return eDay === dayStr
    })

    const revPaise = dayPayments.reduce((acc, p) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
    const expPaise = dayExpenses.reduce((acc, e) => acc + e.amount, 0)

    return {
      date: displayLabel,
      revenueRupees: Math.round(revPaise / 100),
      expenseRupees: Math.round(expPaise / 100),
      netProfitRupees: Math.round((revPaise - expPaise) / 100),
    }
  })

  // 5. Revenue by Room Breakdown
  const roomRevenueMap = await prisma.room.findMany({
    include: {
      bookings: {
        where: { status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
        include: { payments: true },
      },
      type: true,
    },
  })

  const revenueByRoom = roomRevenueMap
    .map((room) => {
      const totalPaise = room.bookings.reduce((sum, b) => {
        const paid = b.payments.reduce((pSum, p) => pSum + p.amount, 0)
        return sum + paid
      }, 0)
      return {
        roomNumber: `Room ${room.number}`,
        type: room.type?.name || 'Standard',
        revenueRupees: Math.round(totalPaise / 100),
      }
    })
    .sort((a, b) => b.revenueRupees - a.revenueRupees)
    .slice(0, 8)

  // 6. Booking Sources Breakdown
  const allBookings = await prisma.booking.findMany({
    select: { source: true },
  })

  const sourceCounts: Record<string, number> = {}
  for (const b of allBookings) {
    sourceCounts[b.source] = (sourceCounts[b.source] || 0) + 1
  }

  const bookingSourcesData = Object.entries(sourceCounts).map(([source, count]) => ({
    name: source.replace('_', ' '),
    value: count,
  }))

  return {
    kpis: {
      recognizedRevenuePaise,
      totalCollectedPaise,
      totalExpensesPaise,
      netOperatingProfitPaise,
      cashFlowPaise,
      occupancyRate,
      totalRooms,
      availableRooms,
      occupiedRooms,
      cleaningRooms,
      maintenanceRooms,
      reservedRooms,
      checkInsCount,
      checkOutsCount,
      bookingsCreatedCount,
      pendingPaymentsPaise,
    },
    charts: {
      dailyTrends,
      paymentsByMethod: [
        { method: 'UPI', amountRupees: Math.round(paymentsByMethod.UPI / 100) },
        { method: 'Cash', amountRupees: Math.round(paymentsByMethod.CASH / 100) },
        { method: 'Card', amountRupees: Math.round(paymentsByMethod.CARD / 100) },
        { method: 'Bank Transfer', amountRupees: Math.round(paymentsByMethod.BANK_TRANSFER / 100) },
        { method: 'Other', amountRupees: Math.round(paymentsByMethod.OTHER / 100) },
      ].filter((m) => m.amountRupees > 0),
      revenueByRoom,
      bookingSources: bookingSourcesData,
    },
    meta: {
      range,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  }
}

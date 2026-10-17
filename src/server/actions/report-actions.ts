// src/server/actions/report-actions.ts
'use server'

import { prisma } from '@/lib/db'
import { startOfDay, endOfDay, differenceInDays } from 'date-fns'
import { requirePermission } from '@/lib/auth'

export interface ReportFilter {
  startDate?: string
  endDate?: string
  roomId?: string
  roomTypeId?: string
  categoryId?: string
  source?: string
  method?: string
}

export async function getRevenueReport(filter: ReportFilter = {}) {
  await requirePermission('VIEW_REPORTS')
  const where: any = {
    status: { notIn: ['CANCELLED', 'NO_SHOW'] },
  }

  if (filter.startDate || filter.endDate) {
    where.createdAt = {}
    if (filter.startDate) where.createdAt.gte = startOfDay(new Date(filter.startDate))
    if (filter.endDate) where.createdAt.lte = endOfDay(new Date(filter.endDate))
  }

  if (filter.roomId && filter.roomId !== 'ALL') where.roomId = filter.roomId
  if (filter.source && filter.source !== 'ALL') where.source = filter.source

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      guest: true,
      room: { include: { type: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Filter by roomType if specified
  const filteredBookings = filter.roomTypeId && filter.roomTypeId !== 'ALL'
    ? bookings.filter((b) => b.room.typeId === filter.roomTypeId)
    : bookings

  const totalGrossRevenue = filteredBookings.reduce((sum, b) => sum + b.totalAmount, 0)
  const totalTax = filteredBookings.reduce((sum, b) => sum + b.tax, 0)
  const totalDiscounts = filteredBookings.reduce((sum, b) => sum + b.discount, 0)
  const totalCollected = filteredBookings.reduce(
    (sum, b) => sum + b.payments.reduce((pSum, p) => p.isRefund ? pSum - p.amount : pSum + p.amount, 0),
    0
  )
  const totalOutstanding = Math.max(0, totalGrossRevenue - totalCollected)

  return {
    bookings: filteredBookings,
    summary: {
      count: filteredBookings.length,
      totalGrossRevenue,
      totalTax,
      totalDiscounts,
      totalCollected,
      totalOutstanding,
    },
  }
}

export async function getExpenseReport(filter: ReportFilter = {}) {
  await requirePermission('VIEW_REPORTS')
  const where: any = {}

  if (filter.startDate || filter.endDate) {
    where.date = {}
    if (filter.startDate) where.date.gte = startOfDay(new Date(filter.startDate))
    if (filter.endDate) where.date.lte = endOfDay(new Date(filter.endDate))
  }

  if (filter.categoryId && filter.categoryId !== 'ALL') where.categoryId = filter.categoryId
  if (filter.method && filter.method !== 'ALL') where.method = filter.method

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      category: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  })

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Category grouping
  const byCategory: Record<string, number> = {}
  for (const e of expenses) {
    const cName = e.category.name
    byCategory[cName] = (byCategory[cName] || 0) + e.amount
  }

  return {
    expenses,
    summary: {
      count: expenses.length,
      totalExpenses,
      byCategory,
    },
  }
}

export async function getProfitAndLossReport(filter: ReportFilter = {}) {
  await requirePermission('VIEW_REPORTS')
  const [revenueData, expenseData] = await Promise.all([
    getRevenueReport(filter),
    getExpenseReport(filter),
  ])

  const totalRevenue = revenueData.summary.totalGrossRevenue
  const totalExpenses = expenseData.summary.totalExpenses
  const netOperatingResult = totalRevenue - totalExpenses

  // Cash basis
  const cashCollected = revenueData.summary.totalCollected
  const cashExpenses = expenseData.expenses
    .filter((e) => e.method === 'CASH')
    .reduce((sum, e) => sum + e.amount, 0)
  const netCashFlow = cashCollected - cashExpenses

  return {
    revenue: revenueData.summary,
    expense: expenseData.summary,
    netOperatingResult,
    netCashFlow,
  }
}

export async function getOccupancyReport(filter: ReportFilter = {}) {
  await requirePermission('VIEW_REPORTS')
  const start = filter.startDate ? startOfDay(new Date(filter.startDate)) : startOfDay(new Date(Date.now() - 30 * 86400000))
  const end = filter.endDate ? endOfDay(new Date(filter.endDate)) : endOfDay(new Date())
  const daysInPeriod = Math.max(1, differenceInDays(end, start) + 1)

  const totalRooms = await prisma.room.count({ where: { isActive: true } })
  const availableRoomNights = totalRooms * daysInPeriod

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
      checkInDate: { lte: end },
      OR: [
        { checkoutDate: { gte: start } },
        { checkoutDate: null },
      ],
    },
    include: { room: true },
  })

  // Compute occupied room nights in this window
  let occupiedRoomNights = 0
  let totalRoomRevenue = 0

  for (const b of bookings) {
    const bStart = b.checkInDate < start ? start : b.checkInDate
    const bCheckout = b.checkoutDate || end
    const bEnd = bCheckout > end ? end : bCheckout
    const stayNights = Math.max(1, differenceInDays(bEnd, bStart))
    occupiedRoomNights += stayNights
    totalRoomRevenue += (b.roomTariff * stayNights)
  }

  const occupancyRate = availableRoomNights > 0 ? (occupiedRoomNights / availableRoomNights) * 100 : 0
  const adr = occupiedRoomNights > 0 ? Math.round(totalRoomRevenue / occupiedRoomNights) : 0
  const revpar = availableRoomNights > 0 ? Math.round(totalRoomRevenue / availableRoomNights) : 0

  return {
    period: { start, end, daysInPeriod },
    totalRooms,
    availableRoomNights,
    occupiedRoomNights,
    occupancyRate: Number(occupancyRate.toFixed(1)),
    adr,
    revpar,
    totalRoomRevenue,
  }
}

export async function getOutstandingPaymentsReport() {
  await requirePermission('VIEW_REPORTS')
  const bookings = await prisma.booking.findMany({
    where: {
      paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    include: {
      guest: true,
      room: { include: { type: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const records = bookings.map((b) => {
    const totalPaid = b.payments.reduce((acc, p) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
    const balance = Math.max(0, b.totalAmount - totalPaid)
    return {
      ...b,
      totalPaid,
      balance,
    }
  }).filter((r) => r.balance > 0)

  const totalOutstanding = records.reduce((sum, r) => sum + r.balance, 0)

  return {
    records,
    totalOutstanding,
    count: records.length,
  }
}

export async function getRoomPerformanceReport(filter: ReportFilter = {}) {
  await requirePermission('VIEW_REPORTS')
  const start = filter.startDate ? startOfDay(new Date(filter.startDate)) : startOfDay(new Date(Date.now() - 30 * 86400000))
  const end = filter.endDate ? endOfDay(new Date(filter.endDate)) : endOfDay(new Date())
  const daysInPeriod = Math.max(1, differenceInDays(end, start) + 1)

  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: {
      type: true,
      bookings: {
        where: {
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
          checkInDate: { lte: end },
          OR: [
            { checkoutDate: { gte: start } },
            { checkoutDate: null },
          ],
        },
      },
    },
    orderBy: { number: 'asc' },
  })

  const performance = rooms.map((room) => {
    let nightsOccupied = 0
    let revenue = 0

    for (const b of room.bookings) {
      const bStart = b.checkInDate < start ? start : b.checkInDate
      const bCheckout = b.checkoutDate || end
      const bEnd = bCheckout > end ? end : bCheckout
      const nights = Math.max(1, differenceInDays(bEnd, bStart))
      nightsOccupied += nights
      revenue += (b.roomTariff * nights)
    }

    const occupancyRate = (nightsOccupied / daysInPeriod) * 100
    const averageRate = nightsOccupied > 0 ? Math.round(revenue / nightsOccupied) : room.type.baseTariff

    return {
      id: room.id,
      number: room.number,
      floor: room.floor,
      typeName: room.type.name,
      baseTariff: room.type.baseTariff,
      nightsOccupied,
      revenue,
      occupancyRate: Number(occupancyRate.toFixed(1)),
      averageRate,
    }
  })

  return {
    performance,
    daysInPeriod,
  }
}

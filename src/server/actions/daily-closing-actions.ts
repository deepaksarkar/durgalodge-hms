// src/server/actions/daily-closing-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { startOfDay, endOfDay, subDays, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { HOTEL_TIMEZONE } from '@/lib/date-utils'
import { getSession } from '@/lib/session'
import { requireAuth } from '@/lib/auth'
import { rupeesToPaise } from '@/lib/currency'

export async function getDailyClosingSummary(dateStr?: string) {
  await requireAuth()
  const targetDate = dateStr ? parseISO(dateStr) : toZonedTime(new Date(), HOTEL_TIMEZONE)
  const start = startOfDay(targetDate)
  const end = endOfDay(targetDate)

  // Check if closing record already exists
  const existing = await prisma.dailyClosing.findUnique({
    where: { businessDate: start },
  })

  // Get previous day's closing to auto-populate opening cash
  const previousDate = startOfDay(subDays(start, 1))
  const previousClosing = await prisma.dailyClosing.findUnique({
    where: { businessDate: previousDate },
  })

  const suggestedOpeningCash = previousClosing ? previousClosing.actualCash : 0

  // Aggregate live payments for business date
  const payments = await prisma.payment.findMany({
    where: { paymentDate: { gte: start, lte: end } },
  })

  let cashCollected = 0
  let upiCollected = 0
  let cardCollected = 0
  let bankCollected = 0
  let otherCollected = 0

  for (const p of payments) {
    const amt = p.isRefund ? -p.amount : p.amount
    if (p.method === 'CASH') cashCollected += amt
    else if (p.method === 'UPI') upiCollected += amt
    else if (p.method === 'CARD') cardCollected += amt
    else if (p.method === 'BANK_TRANSFER') bankCollected += amt
    else otherCollected += amt
  }

  // Aggregate expenses for business date
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
  })

  let totalExpenses = 0
  let cashExpenses = 0
  for (const e of expenses) {
    totalExpenses += e.amount
    if (e.method === 'CASH') cashExpenses += e.amount
  }

  // Operational metrics
  const [bookingsCreated, checkInsCount, checkOutsCount, cancelledCount] = await Promise.all([
    prisma.booking.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.booking.count({ where: { actualCheckIn: { gte: start, lte: end } } }),
    prisma.booking.count({ where: { actualCheckOut: { gte: start, lte: end } } }),
    prisma.booking.count({ where: { status: 'CANCELLED', updatedAt: { gte: start, lte: end } } }),
  ])

  // Recognized Revenue for bookings created today
  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      createdAt: { gte: start, lte: end },
    },
  })
  const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0)
  const netResult = totalRevenue - totalExpenses

  // Total outstanding balances
  const activeBookings = await prisma.booking.findMany({
    where: { status: { in: ['RESERVED', 'CHECKED_IN'] } },
    include: { payments: true },
  })
  const outstandingBalances = activeBookings.reduce((sum, b) => {
    const paid = b.payments.reduce((pSum, p) => p.isRefund ? pSum - p.amount : pSum + p.amount, 0)
    return b.totalAmount > paid ? sum + (b.totalAmount - paid) : sum
  }, 0)

  const openingCash = existing ? existing.openingCash : suggestedOpeningCash
  const expectedCash = openingCash + cashCollected - cashExpenses
  const actualCash = existing ? existing.actualCash : expectedCash
  const difference = actualCash - expectedCash

  return {
    date: start.toISOString(),
    isFinalized: existing?.isFinalized || false,
    finalizedBy: existing?.finalizedBy || null,
    finalizedAt: existing?.finalizedAt || null,
    metrics: {
      openingCash,
      cashCollected,
      upiCollected,
      cardCollected,
      bankCollected,
      otherCollected,
      cashExpenses,
      expectedCash,
      actualCash,
      difference,
      totalRevenue,
      totalExpenses,
      netResult,
      bookingsCreated,
      checkInsCount,
      checkOutsCount,
      cancelledCount,
      outstandingBalances,
      notes: existing?.notes || '',
    },
  }
}

export async function finalizeDailyClosing(formData: {
  date: string
  openingCashRupees: number
  actualCashRupees: number
  notes?: string
}) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied')
  }

  const targetDate = startOfDay(parseISO(formData.date))
  const end = endOfDay(targetDate)

  // Check if already finalized and prevent non-admin edit
  const existing = await prisma.dailyClosing.findUnique({
    where: { businessDate: targetDate },
  })

  if (existing?.isFinalized && session.role !== Role.ADMIN) {
    throw new Error('Daily closing has already been finalized. Admin authorization is required to modify.')
  }

  const summary = await getDailyClosingSummary(formData.date)
  const openingCashPaise = rupeesToPaise(formData.openingCashRupees)
  const actualCashPaise = rupeesToPaise(formData.actualCashRupees)
  const expectedCashPaise = openingCashPaise + summary.metrics.cashCollected - summary.metrics.cashExpenses
  const differencePaise = actualCashPaise - expectedCashPaise

  const user = await prisma.user.findUnique({ where: { id: session.userId } })

  const closing = await prisma.dailyClosing.upsert({
    where: { businessDate: targetDate },
    update: {
      openingCash: openingCashPaise,
      cashCollected: summary.metrics.cashCollected,
      upiCollected: summary.metrics.upiCollected,
      cardCollected: summary.metrics.cardCollected,
      bankCollected: summary.metrics.bankCollected,
      otherCollected: summary.metrics.otherCollected,
      cashExpenses: summary.metrics.cashExpenses,
      expectedCash: expectedCashPaise,
      actualCash: actualCashPaise,
      difference: differencePaise,
      totalRevenue: summary.metrics.totalRevenue,
      totalExpenses: summary.metrics.totalExpenses,
      netResult: summary.metrics.netResult,
      bookingsCreated: summary.metrics.bookingsCreated,
      checkInsCount: summary.metrics.checkInsCount,
      checkOutsCount: summary.metrics.checkOutsCount,
      cancelledCount: summary.metrics.cancelledCount,
      outstandingBalances: summary.metrics.outstandingBalances,
      isFinalized: true,
      finalizedBy: user?.name || session.userId,
      finalizedAt: new Date(),
      notes: formData.notes,
    },
    create: {
      businessDate: targetDate,
      openingCash: openingCashPaise,
      cashCollected: summary.metrics.cashCollected,
      upiCollected: summary.metrics.upiCollected,
      cardCollected: summary.metrics.cardCollected,
      bankCollected: summary.metrics.bankCollected,
      otherCollected: summary.metrics.otherCollected,
      cashExpenses: summary.metrics.cashExpenses,
      expectedCash: expectedCashPaise,
      actualCash: actualCashPaise,
      difference: differencePaise,
      totalRevenue: summary.metrics.totalRevenue,
      totalExpenses: summary.metrics.totalExpenses,
      netResult: summary.metrics.netResult,
      bookingsCreated: summary.metrics.bookingsCreated,
      checkInsCount: summary.metrics.checkInsCount,
      checkOutsCount: summary.metrics.checkOutsCount,
      cancelledCount: summary.metrics.cancelledCount,
      outstandingBalances: summary.metrics.outstandingBalances,
      isFinalized: true,
      finalizedBy: user?.name || session.userId,
      finalizedAt: new Date(),
      notes: formData.notes,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'DAILY_CLOSING_FINALIZED',
      entity: 'DailyClosing',
      entityId: closing.id,
      metadata: {
        date: formData.date,
        expectedCash: expectedCashPaise,
        actualCash: actualCashPaise,
        difference: differencePaise,
      },
    },
  })

  revalidatePath('/daily-closing')
  revalidatePath('/dashboard')
  return { success: true, closing }
}

export async function getDailyClosingHistory() {
  await requireAuth()
  return await prisma.dailyClosing.findMany({
    orderBy: { businessDate: 'desc' },
    take: 30,
  })
}

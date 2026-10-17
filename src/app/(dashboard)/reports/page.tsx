// src/app/(dashboard)/reports/page.tsx
import React from 'react'
import {
  getRevenueReport,
  getExpenseReport,
  getProfitAndLossReport,
  getOccupancyReport,
  getOutstandingPaymentsReport,
  getRoomPerformanceReport,
} from '@/server/actions/report-actions'
import { ReportsView } from '@/components/reports/reports-view'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  const [
    revenueReport,
    expenseReport,
    pnlReport,
    occupancyReport,
    outstandingReport,
    roomPerformanceReport,
  ] = await Promise.all([
    getRevenueReport(),
    getExpenseReport(),
    getProfitAndLossReport(),
    getOccupancyReport(),
    getOutstandingPaymentsReport(),
    getRoomPerformanceReport(),
  ])

  return (
    <ReportsView
      revenueReport={revenueReport}
      expenseReport={expenseReport}
      pnlReport={pnlReport}
      occupancyReport={occupancyReport}
      outstandingReport={outstandingReport}
      roomPerformanceReport={roomPerformanceReport}
    />
  )
}

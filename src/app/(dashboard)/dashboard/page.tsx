// src/app/(dashboard)/dashboard/page.tsx
import React, { Suspense } from 'react'
import { getDashboardData, TimeRangeFilter } from '@/server/actions/dashboard-actions'
import { syncActiveFlexibleBookings } from '@/server/actions/booking-actions'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; startDate?: string; endDate?: string }>
}) {
  try {
    await syncActiveFlexibleBookings()
  } catch (err) {
    console.warn('Flexible bookings sync skipped on initial render:', err)
  }

  let range: TimeRangeFilter = 'today'
  let startDate: string | undefined
  let endDate: string | undefined

  if (searchParams) {
    try {
      const params = await searchParams
      if (params?.range) range = params.range as TimeRangeFilter
      startDate = params?.startDate
      endDate = params?.endDate
    } catch {
      // Fallback to default range
    }
  }

  const data = await getDashboardData({
    range,
    startDate,
    endDate,
  })

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Dashboard...</div>}>
      <DashboardView data={data} />
    </Suspense>
  )
}

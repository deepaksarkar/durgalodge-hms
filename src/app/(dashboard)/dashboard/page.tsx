import React from 'react'
import { getDashboardData, TimeRangeFilter } from '@/server/actions/dashboard-actions'
import { syncActiveFlexibleBookings } from '@/server/actions/booking-actions'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; startDate?: string; endDate?: string }>
}) {
  await syncActiveFlexibleBookings()
  const params = await searchParams
  const range = (params.range as TimeRangeFilter) || 'today'

  const data = await getDashboardData({
    range,
    startDate: params.startDate,
    endDate: params.endDate,
  })

  return <DashboardView data={data} />
}

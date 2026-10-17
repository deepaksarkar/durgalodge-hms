// src/app/(dashboard)/daily-closing/page.tsx
import React from 'react'
import { getDailyClosingSummary, getDailyClosingHistory } from '@/server/actions/daily-closing-actions'
import { DailyClosingView } from '@/components/daily-closing/daily-closing-view'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DailyClosingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  const params = await searchParams
  const [summary, history] = await Promise.all([
    getDailyClosingSummary(params.date),
    getDailyClosingHistory(),
  ])

  return <DailyClosingView summary={summary} history={history} />
}

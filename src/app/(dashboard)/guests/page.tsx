// src/app/(dashboard)/guests/page.tsx
import React from 'react'
import { getGuests } from '@/server/actions/guest-actions'
import { getCurrentUser } from '@/lib/auth'
import { GuestsView } from '@/components/guests/guests-view'

export const dynamic = 'force-dynamic'

export default async function GuestsPage() {
  const [currentUser, initialData] = await Promise.all([
    getCurrentUser(),
    getGuests({ limit: 100 }),
  ])
  return <GuestsView initialData={initialData} userRole={currentUser?.role} />
}

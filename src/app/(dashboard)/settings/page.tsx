// src/app/(dashboard)/settings/page.tsx
import React from 'react'
import { getHotelSettings } from '@/server/actions/settings-actions'
import { getRoomTypes } from '@/server/actions/room-actions'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/admin/settings-view'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  const [settings, roomTypes, rooms] = await Promise.all([
    getHotelSettings(),
    getRoomTypes(),
    prisma.room.findMany({
      include: { type: true },
      orderBy: { number: 'asc' },
    }),
  ])

  return (
    <SettingsView
      hotelSettings={settings}
      roomTypes={roomTypes}
      rooms={rooms}
      userRole={currentUser?.role}
    />
  )
}

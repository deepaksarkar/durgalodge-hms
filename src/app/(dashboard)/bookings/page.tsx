import React from 'react'
import { getBookings, syncActiveFlexibleBookings } from '@/server/actions/booking-actions'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { BookingsView } from '@/components/bookings/bookings-view'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  // Sync active flexible stays with real-time Asia/Kolkata clock before loading bookings
  await syncActiveFlexibleBookings()

  const [currentUser, initialBookings, availableRooms, initialGuests] = await Promise.all([
    getCurrentUser(),
    getBookings({ limit: 100 }),
    prisma.room.findMany({
      where: { isActive: true },
      include: { type: true },
      orderBy: { number: 'asc' },
    }),
    prisma.guest.findMany({
      orderBy: { fullName: 'asc' },
      take: 100,
    }),
  ])

  return (
    <BookingsView
      initialBookings={initialBookings}
      availableRooms={availableRooms}
      initialGuests={initialGuests}
      userRole={currentUser?.role}
    />
  )
}

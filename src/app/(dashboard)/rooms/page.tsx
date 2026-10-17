// src/app/(dashboard)/rooms/page.tsx
import React from 'react'
import { getRoomsWithStatus, getRoomTypes } from '@/server/actions/room-actions'
import { getCurrentUser } from '@/lib/auth'
import { RoomGrid } from '@/components/rooms/room-grid'
import { BedDouble } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function RoomsPage() {
  const [rooms, roomTypes, currentUser] = await Promise.all([
    getRoomsWithStatus(),
    getRoomTypes(),
    getCurrentUser(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <BedDouble className="w-7 h-7 text-amber-500" />
            <span>Room Operations</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time occupancy status, maintenance, and floor management for DURGA LODGE.
          </p>
        </div>
      </div>

      {/* Visual Room Grid */}
      <RoomGrid
        initialRooms={rooms}
        roomTypes={roomTypes}
        userRole={currentUser?.role}
      />
    </div>
  )
}
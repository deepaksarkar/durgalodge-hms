import React from 'react'
import { prisma } from '@/lib/db'
import { UserX, Clock, CheckCircle2, RefreshCw } from 'lucide-react'
import { CheckOutCard } from '@/components/operations/check-out-card'
import { syncActiveFlexibleBookings } from '@/server/actions/booking-actions'

export const dynamic = 'force-dynamic'

export default async function CheckOutsPage() {
  // Sync active flexible stays with real-time Asia/Kolkata clock before rendering folios
  await syncActiveFlexibleBookings()

  const [activeOccupied, recentlyDeparted] = await Promise.all([
    prisma.booking.findMany({
      where: { status: 'CHECKED_IN' },
      include: {
        guest: true,
        room: { include: { type: true } },
        payments: true,
      },
      orderBy: { checkoutDate: 'asc' },
    }),
    prisma.booking.findMany({
      where: { status: 'CHECKED_OUT' },
      include: {
        guest: true,
        room: { include: { type: true } },
        payments: true,
      },
      orderBy: { actualCheckOut: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserX className="w-7 h-7 text-rose-500" />
            <span>Reception Check-Out & Billing Desk</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review guest folios, settle balances, print invoices, and release rooms to housekeeping.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>Asia/Kolkata Time API Active</span>
          </span>
        </div>
      </div>

      {/* Occupied Rooms Awaiting Check-Out */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Currently Occupied Rooms ({activeOccupied.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Ready for Departure</span>
        </div>

        {activeOccupied.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-200">No rooms currently occupied</p>
            <p className="mt-1 text-slate-500">All guests have checked out or no active stays.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeOccupied.map((booking) => (
              <CheckOutCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

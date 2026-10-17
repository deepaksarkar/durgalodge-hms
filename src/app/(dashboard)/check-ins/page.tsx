// src/app/(dashboard)/check-ins/page.tsx
import React from 'react'
import { prisma } from '@/lib/db'
import { formatHotelDate } from '@/lib/date-utils'
import { formatCurrency } from '@/lib/currency'
import { UserCheck, Clock, BedDouble, Phone, CheckCircle2 } from 'lucide-react'
import { CheckInCard } from '@/components/operations/check-in-card'

export const dynamic = 'force-dynamic'

export default async function CheckInsPage() {
  const [pendingCheckIns, activeCheckedIn] = await Promise.all([
    prisma.booking.findMany({
      where: { status: 'RESERVED' },
      include: {
        guest: true,
        room: { include: { type: true } },
        payments: true,
      },
      orderBy: { checkInDate: 'asc' },
    }),
    prisma.booking.findMany({
      where: { status: 'CHECKED_IN' },
      include: {
        guest: true,
        room: { include: { type: true } },
        payments: true,
        checkInUser: { select: { name: true } },
      },
      orderBy: { actualCheckIn: 'desc' },
      take: 10,
    }),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-500" />
            <span>Reception Check-In Desk</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify guest ID, confirm room assignment, and execute atomic check-in transitions.
          </p>
        </div>
      </div>

      {/* Pending Arrivals / Reserved Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Pending Check-Ins ({pendingCheckIns.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Awaiting Guest Arrival</span>
        </div>

        {pendingCheckIns.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-200">No pending check-ins at this moment</p>
            <p className="mt-1 text-slate-500">All reserved arrivals have been processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingCheckIns.map((booking) => (
              <CheckInCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>

      {/* Recently Checked-In In-House Guests */}
      <div className="pt-6 border-t border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Currently In-House Guests</span>
        </h2>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Room</th>
                  <th className="p-3.5">Guest</th>
                  <th className="p-3.5">Check-In Date</th>
                  <th className="p-3.5">Expected Checkout</th>
                  <th className="p-3.5">Processed By</th>
                  <th className="p-3.5">Total & Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {activeCheckedIn.map((b) => {
                  const paid = b.payments.reduce((acc, p) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
                  const balance = Math.max(0, b.totalAmount - paid)

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/30">
                      <td className="p-3.5 font-bold text-white">
                        Room {b.room.number}
                        <span className="text-[10px] text-slate-500 block font-normal">
                          {b.room.type.name}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-200 block">{b.guest.fullName}</span>
                        <span className="text-[10px] text-slate-400">{b.guest.phone}</span>
                      </td>
                      <td className="p-3.5 text-slate-300">{formatHotelDate(b.actualCheckIn || b.checkInDate)}</td>
                      <td className="p-3.5 text-slate-300">
                        {b.checkoutDate ? formatHotelDate(b.checkoutDate) : (
                          <span className="text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded text-[10px]">
                            Flexible
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                        {b.checkInUser?.name || 'Staff'}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-slate-200 font-semibold">
                          {formatCurrency(b.totalAmount)}
                        </span>
                        {balance > 0 ? (
                          <span className="text-rose-400 font-mono text-[10px] block">
                            Due: {formatCurrency(balance)}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-mono text-[10px] block">Paid Full</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

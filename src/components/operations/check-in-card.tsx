// src/components/operations/check-in-card.tsx
'use client'

import React, { useState } from 'react'
import { checkInBooking } from '@/server/actions/booking-actions'
import { formatCurrency } from '@/lib/currency'
import { formatHotelDate, getHotelCurrentTimeString } from '@/lib/date-utils'
import { UserCheck, Phone, BedDouble, Calendar, ShieldCheck, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function CheckInCard({ booking }: { booking: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkInTime, setCheckInTime] = useState(getHotelCurrentTimeString())
  const [notes, setNotes] = useState('')

  const handleExecuteCheckIn = async () => {
    setLoading(true)
    try {
      await checkInBooking({
        bookingId: booking.id,
        checkInTime: checkInTime || undefined,
        notes: notes || undefined,
      })
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Check-in failed')
    } finally {
      setLoading(false)
    }
  }

  const paid = booking.payments.reduce((acc: number, p: any) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
  const balance = Math.max(0, booking.totalAmount - paid)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all space-y-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-amber-500 uppercase">
              {booking.bookingNumber}
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">{booking.guest.fullName}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{booking.guest.phone}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-lg font-black text-amber-400">Room {booking.room.number}</span>
            <span className="text-[10px] text-slate-400 block">{booking.room.type.name}</span>
          </div>
        </div>

        {/* Stay Dates */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Duration:</span>
            </span>
            <span className="font-semibold">
              {booking.checkoutDate ? `${booking.nights} night(s)` : 'Flexible (Open-ended)'}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
            <span>Check-in: {formatHotelDate(booking.checkInDate)}</span>
            <span>Check-out: {booking.checkoutDate ? formatHotelDate(booking.checkoutDate) : 'Open / Flexible'}</span>
          </div>
        </div>

        {/* Check-In Time Input */}
        <div>
          <label className="text-slate-400 flex items-center gap-1 text-[11px] mb-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>Actual Check-In Time *</span>
          </label>
          <input
            type="time"
            required
            value={checkInTime}
            onChange={(e) => setCheckInTime(e.target.value)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
          />
        </div>

        {/* ID verification indicator */}
        <div className="text-[11px] text-slate-400 flex items-center justify-between">
          <span>Guest ID:</span>
          <span className="text-slate-200 font-mono">
            {booking.guest.idType ? `${booking.guest.idType}: ${booking.guest.idNumber || 'Verified'}` : 'Not provided yet'}
          </span>
        </div>

        {/* Financials */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 block text-[10px]">Total Bill</span>
            <span className="font-mono font-bold text-slate-200">
              {formatCurrency(booking.totalAmount)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block text-[10px]">Pending Due</span>
            <span className={`font-mono font-bold ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Check In Action */}
      <div className="pt-3 border-t border-slate-800">
        <button
          onClick={handleExecuteCheckIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <span>Processing Check-In...</span>
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              <span>Confirm & Check-In ({checkInTime})</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

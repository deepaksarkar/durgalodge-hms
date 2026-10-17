// src/components/operations/check-out-card.tsx
'use client'

import React, { useState } from 'react'
import { checkOutBooking } from '@/server/actions/booking-actions'
import { formatCurrency } from '@/lib/currency'
import { formatHotelDate, formatHotelTime, getHotelCurrentTimeString } from '@/lib/date-utils'
import { PaymentMethod } from '@prisma/client'
import { UserX, Phone, AlertTriangle, Sparkles, CheckCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function CheckOutCard({ booking }: { booking: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSettle, setShowSettle] = useState(false)
  const [checkOutTime, setCheckOutTime] = useState(getHotelCurrentTimeString())
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [ref, setRef] = useState('')

  // Take reservation / check-in time as check-in anchor
  const effectiveCheckIn = new Date(booking.actualCheckIn || booking.createdAt || booking.checkInDate)
  const today = new Date().toISOString().split('T')[0]
  const checkoutDateTime = new Date(`${today}T${checkOutTime || '12:00'}:00`)
  const diffMs = Math.max(0, checkoutDateTime.getTime() - effectiveCheckIn.getTime())
  // Dynamically calculate actual elapsed nights (minimum 1, +1 for each 24h cycle)
  const activeNights = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))

  // Dynamic live calculations based on active nights
  const roomCharges = booking.roomTariff * activeNights
  const extraTotal = (booking.extraCharges || 0) * activeNights
  const discountTotal = (booking.discount || 0) * activeNights
  const taxableAmount = Math.max(0, roomCharges + extraTotal - discountTotal)
  const tax = booking.taxRate ? Math.round((taxableAmount * booking.taxRate) / 10000) : 0
  const dynamicTotal = taxableAmount + tax

  const paid = booking.payments.reduce((acc: number, p: any) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
  const balance = Math.max(0, dynamicTotal - paid)

  const handleExecuteCheckOut = async (settle: boolean) => {
    if (balance > 0 && !settle) {
      if (!confirm(`Warning: Booking has an outstanding balance of ${formatCurrency(balance)}. Proceed anyway according to hotel policy?`)) {
        return
      }
    }

    setLoading(true)
    try {
      await checkOutBooking({
        bookingId: booking.id,
        checkOutTime: checkOutTime || undefined,
        settleBalance: settle,
        paymentMethod: settle ? method : undefined,
        paymentReference: settle ? ref : undefined,
      })
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Check-out failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all space-y-4">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-rose-500 uppercase">
                {booking.bookingNumber}
              </span>
              {!booking.checkoutDate && (
                <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-medium">
                  Flexible Stay
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">{booking.guest.fullName}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Phone className="w-3 h-3 text-slate-500" />
              <span>{booking.guest.phone}</span>
            </p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>In: {formatHotelDate(effectiveCheckIn)} ({formatHotelTime(effectiveCheckIn)})</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-lg font-black text-rose-400">Room {booking.room.number}</span>
            <span className="text-[10px] text-slate-400 block">{booking.room.type.name}</span>
          </div>
        </div>

        {/* Detailed Charges Breakdown */}
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-400">
            <span>Room Tariff ({activeNights} {activeNights === 1 ? 'night' : 'nights'}):</span>
            <span className="font-mono text-slate-200">{formatCurrency(roomCharges)}</span>
          </div>
          {booking.extraCharges > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>Extra Charges ({formatCurrency(booking.extraCharges)}/day):</span>
              <span className="font-mono text-slate-200">{formatCurrency(extraTotal)}</span>
            </div>
          )}
          {booking.discount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Discount ({formatCurrency(booking.discount)}/day):</span>
              <span className="font-mono">-{formatCurrency(discountTotal)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-slate-400">
              <span>GST ({booking.taxRate ? booking.taxRate / 100 : 0}%):</span>
              <span className="font-mono text-slate-200">{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold pt-1.5 border-t border-slate-900 text-slate-200">
            <span>Total Bill ({activeNights} nights):</span>
            <span className="font-mono">{formatCurrency(dynamicTotal)}</span>
          </div>
          <div className="flex justify-between text-emerald-400 font-semibold">
            <span>Amount Paid:</span>
            <span className="font-mono">{formatCurrency(paid)}</span>
          </div>
          <div className="flex justify-between font-bold pt-1 border-t border-slate-900 text-sm">
            <span className={balance > 0 ? 'text-rose-400' : 'text-slate-200'}>Balance Due:</span>
            <span className={`font-mono ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(balance)}
            </span>
          </div>
        </div>

        {/* Check-Out Time Input */}
        <div>
          <label className="text-slate-400 flex items-center gap-1 text-[11px] mb-1">
            <Clock className="w-3 h-3 text-rose-400" />
            <span>Actual Check-Out Time *</span>
          </label>
          <input
            type="time"
            required
            value={checkOutTime}
            onChange={(e) => setCheckOutTime(e.target.value)}
            className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs focus:border-rose-500 focus:outline-none"
          />
        </div>

        {balance > 0 && showSettle && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl space-y-2 text-xs">
            <p className="font-semibold text-rose-300">Settle Balance ({formatCurrency(balance)})</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Method</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block text-[10px] mb-1">Reference</label>
                <input
                  type="text"
                  value={ref}
                  onChange={(e) => setRef(e.target.value)}
                  placeholder="Counter slip"
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Check Out Actions */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        {balance > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {!showSettle ? (
              <button
                type="button"
                onClick={() => setShowSettle(true)}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-xs transition-all cursor-pointer"
              >
                Settle & Check Out
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleExecuteCheckOut(true)}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Confirm Settlement'}
              </button>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => handleExecuteCheckOut(false)}
              className="py-2.5 px-3 bg-rose-600/80 hover:bg-rose-600 text-white font-medium rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Check Out (Unpaid)
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={loading}
            onClick={() => handleExecuteCheckOut(false)}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Checking Out...</span>
            ) : (
              <>
                <UserX className="w-4 h-4" />
                <span>Complete Check-Out ({checkOutTime})</span>
              </>
            )}
          </button>
        )}

        <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
          <Link
            href={`/bookings/${booking.id}/invoice`}
            className="hover:text-amber-400 underline underline-offset-2"
          >
            View Folio / Invoice
          </Link>
          <span className="text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Sets cleaning queue</span>
          </span>
        </div>
      </div>
    </div>
  )
}

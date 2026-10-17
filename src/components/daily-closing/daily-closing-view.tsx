// src/components/daily-closing/daily-closing-view.tsx
'use client'

import React, { useState } from 'react'
import { formatCurrency, rupeesToPaise } from '@/lib/currency'
import { formatHotelDate } from '@/lib/date-utils'
import { finalizeDailyClosing } from '@/server/actions/daily-closing-actions'
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Coins,
  Receipt,
  IndianRupee,
  Calendar,
  History,
  ShieldCheck,
  FileCheck
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export function DailyClosingView({
  summary,
  history,
}: {
  summary: any
  history: any[]
}) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(summary.date.split('T')[0])
  const [openingCashRupees, setOpeningCashRupees] = useState(summary.metrics.openingCash / 100)
  const [actualCashRupees, setActualCashRupees] = useState(summary.metrics.actualCash / 100)
  const [notes, setNotes] = useState(summary.metrics.notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Live expected cash calculation
  const cashCollectedRupees = summary.metrics.cashCollected / 100
  const cashExpensesRupees = summary.metrics.cashExpenses / 100
  const expectedCashRupees = openingCashRupees + cashCollectedRupees - cashExpensesRupees
  const differenceRupees = actualCashRupees - expectedCashRupees

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate)
    router.push(`/daily-closing?date=${newDate}`)
  }

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!confirm('Are you sure you want to finalize and lock the daily closing for this business date?')) return

    setIsSubmitting(true)
    try {
      await finalizeDailyClosing({
        date: selectedDate,
        openingCashRupees: Number(openingCashRupees),
        actualCashRupees: Number(actualCashRupees),
        notes,
      })
      alert('Daily closing successfully finalized and locked!')
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to finalize daily closing')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Clock className="w-7 h-7 text-amber-500" />
            <span>Hotel Daily Closing & Cashier Reconciliation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Cash drawer audit, digital settlements, revenue verification, and end-of-day ledger locking.
          </p>
        </div>

        {/* Business Date Picker */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span className="text-slate-400 font-medium">Business Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Finalized Banner if Locked */}
      {summary.isFinalized && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between text-xs text-emerald-400">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-bold text-slate-100">Daily Closing Finalized & Locked</p>
              <p className="text-slate-400 mt-0.5">
                Closed by {summary.finalizedBy || 'Admin'} on {formatHotelDate(summary.finalizedAt)}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 rounded-full font-mono font-bold text-[10px] uppercase">
            AUDITED
          </span>
        </div>
      )}

      {/* Main Reconciliation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cash Reconciliation Form */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <span>Cash Register Audit</span>
            </h3>
            <span className="text-xs text-slate-400">INR Currency Cash Box</span>
          </div>

          <form onSubmit={handleFinalize} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">
                  Opening Cash Drawer (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  disabled={summary.isFinalized}
                  value={openingCashRupees}
                  onChange={(e) => setOpeningCashRupees(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-base disabled:opacity-60"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Carried forward from prior closing
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Actual Physical Cash Counted (₹) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  disabled={summary.isFinalized}
                  value={actualCashRupees}
                  onChange={(e) => setActualCashRupees(Number(e.target.value))}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono text-base disabled:opacity-60"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Physically verified currency notes and coins
                </span>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex justify-between text-slate-400">
                <span>+ Cash Payments Received Today:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {formatCurrency(summary.metrics.cashCollected)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>- Cash Expenses Paid Out Today:</span>
                <span className="font-mono text-rose-400 font-semibold">
                  -{formatCurrency(summary.metrics.cashExpenses)}
                </span>
              </div>
              <div className="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
                <span>= Expected Cash in Drawer:</span>
                <span className="font-mono text-white text-sm">
                  ₹{expectedCashRupees.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-bold pt-2 border-t border-slate-800 text-sm">
                <span>Reconciliation Discrepancy:</span>
                <span
                  className={`font-mono text-base ${
                    differenceRupees === 0
                      ? 'text-emerald-400'
                      : differenceRupees > 0
                      ? 'text-sky-400'
                      : 'text-rose-400'
                  }`}
                >
                  {differenceRupees === 0
                    ? '₹0.00 (Balanced)'
                    : differenceRupees > 0
                    ? `+₹${differenceRupees.toFixed(2)} (Excess)`
                    : `-₹${Math.abs(differenceRupees).toFixed(2)} (Shortage)`}
                </span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Audit Notes / Cashier Observations</label>
              <textarea
                rows={2}
                disabled={summary.isFinalized}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Discrepancy remarks or handover notes..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 disabled:opacity-60"
              />
            </div>

            {!summary.isFinalized && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Locking...' : 'Finalize & Lock Daily Closing'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right 1 Col: Non-Cash Settlements & Operations KPI */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider text-slate-300">
              Digital & Bank Collections
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">UPI (PhonePe/GPay):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(summary.metrics.upiCollected)}
                </span>
              </div>
              <div className="flex justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">Card (POS Swipes):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(summary.metrics.cardCollected)}
                </span>
              </div>
              <div className="flex justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">Bank Transfer (NEFT):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(summary.metrics.bankCollected)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs">
            <h4 className="font-bold text-white text-sm uppercase tracking-wider text-slate-300">
              Operations Summary
            </h4>
            <div className="space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span>Bookings Created:</span>
                <span className="font-bold">{summary.metrics.bookingsCreated}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-Ins Completed:</span>
                <span className="font-bold">{summary.metrics.checkInsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Check-Outs Completed:</span>
                <span className="font-bold">{summary.metrics.checkOutsCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Cancelled Bookings:</span>
                <span className="font-bold">{summary.metrics.cancelledCount}</span>
              </div>
              <div className="flex justify-between text-rose-400 font-semibold pt-2 border-t border-slate-800">
                <span>Pending Receivables:</span>
                <span className="font-mono">{formatCurrency(summary.metrics.outstandingBalances)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closing History Table */}
      <div className="pt-6 border-t border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-amber-500" />
          <span>Historical Daily Closings</span>
        </h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Business Date</th>
                  <th className="p-3.5">Opening</th>
                  <th className="p-3.5">Cash In</th>
                  <th className="p-3.5">Cash Out</th>
                  <th className="p-3.5">Expected</th>
                  <th className="p-3.5">Actual Count</th>
                  <th className="p-3.5">Difference</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Auditor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 italic">
                      No finalized daily closing records yet.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">
                        {formatHotelDate(h.businessDate)}
                      </td>
                      <td className="p-3.5 font-mono">{formatCurrency(h.openingCash)}</td>
                      <td className="p-3.5 font-mono text-emerald-400">{formatCurrency(h.cashCollected)}</td>
                      <td className="p-3.5 font-mono text-rose-400">{formatCurrency(h.cashExpenses)}</td>
                      <td className="p-3.5 font-mono text-slate-300">{formatCurrency(h.expectedCash)}</td>
                      <td className="p-3.5 font-mono font-bold text-white">{formatCurrency(h.actualCash)}</td>
                      <td className={`p-3.5 font-mono font-bold ${h.difference === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(h.difference)}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                          {h.isFinalized ? 'LOCKED' : 'DRAFT'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400">{h.finalizedBy || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

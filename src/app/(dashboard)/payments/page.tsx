import React from 'react'
import { prisma } from '@/lib/db'
import { formatCurrency } from '@/lib/currency'
import { formatHotelDateTime } from '@/lib/date-utils'
import { syncActiveFlexibleBookings } from '@/server/actions/booking-actions'
import { CreditCard, IndianRupee, Search, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; search?: string }>
}) {
  await syncActiveFlexibleBookings()
  const params = await searchParams
  const where: any = {}

  if (params.method && params.method !== 'ALL') {
    where.method = params.method
  }

  if (params.search && params.search.trim() !== '') {
    const s = params.search.trim()
    where.OR = [
      { reference: { contains: s, mode: 'insensitive' } },
      { notes: { contains: s, mode: 'insensitive' } },
      { booking: { bookingNumber: { contains: s, mode: 'insensitive' } } },
      { booking: { guest: { fullName: { contains: s, mode: 'insensitive' } } } },
    ]
  }

  const [payments, aggregate] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        booking: {
          include: {
            guest: true,
            room: true,
          },
        },
        receivedBy: {
          select: { name: true, role: true },
        },
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    }),
    prisma.payment.aggregate({
      where,
      _sum: { amount: true },
    }),
  ])

  const totalPaise = aggregate._sum.amount || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-500" />
            <span>Payments & Collections Register</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete transaction ledger for Cash, UPI, Cards, and Bank Transfers.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-right">
          <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Collections</p>
          <p className="text-lg font-mono font-bold text-emerald-400">{formatCurrency(totalPaise)}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3">
        <form className="flex-1 flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={params.search || ''}
            placeholder="Search by Ref #, Booking #, Guest..."
            className="flex-1 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          {['ALL', 'UPI', 'CASH', 'CARD', 'BANK_TRANSFER'].map((m) => (
            <Link
              key={m}
              href={`/payments?method=${m}${params.search ? `&search=${params.search}` : ''}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                (params.method || 'ALL') === m
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {m}
            </Link>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Date & Time</th>
                <th className="p-4">Method</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Booking Ref</th>
                <th className="p-4">Guest & Room</th>
                <th className="p-4">Reference / Auth</th>
                <th className="p-4">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-4 text-slate-300">
                      {formatHotelDateTime(p.paymentDate)}
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-200 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] uppercase font-mono">
                        {p.method}
                      </span>
                    </td>

                    <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                      {p.isRefund ? '-' : ''}{formatCurrency(p.amount)}
                    </td>

                    <td className="p-4">
                      <Link
                        href={`/bookings/${p.booking.id}/invoice`}
                        className="font-mono text-amber-400 hover:underline font-semibold"
                      >
                        {p.booking.bookingNumber}
                      </Link>
                    </td>

                    <td className="p-4">
                      <span className="font-semibold text-slate-200 block">
                        {p.booking.guest.fullName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Room {p.booking.room.number}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-slate-400 text-[11px]">
                      {p.reference || '—'}
                    </td>

                    <td className="p-4 text-slate-300">
                      <span className="block font-medium">{p.receivedBy.name}</span>
                      <span className="text-[10px] text-slate-500">{p.receivedBy.role}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

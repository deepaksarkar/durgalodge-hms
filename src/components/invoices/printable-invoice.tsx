// src/components/invoices/printable-invoice.tsx
'use client'

import React from 'react'
import { formatCurrency } from '@/lib/currency'
import { formatHotelDate, formatHotelDateTime, formatHotelTime } from '@/lib/date-utils'
import { Printer, ArrowLeft, Hotel, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface InvoiceProps {
  booking: any
  hotel: any
}

export function PrintableInvoice({ booking, hotel }: InvoiceProps) {
  const totalPaid = booking.payments.reduce((sum: number, p: any) => p.isRefund ? sum - p.amount : sum + p.amount, 0)
  const balance = Math.max(0, booking.totalAmount - totalPaid)

  return (
    <div className="space-y-6">
      {/* Top Toolbar (Hidden during print) */}
      <div className="print:hidden flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <Link
          href={`/bookings`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Bookings</span>
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Tax Invoice</span>
        </button>
      </div>

      {/* Invoice Document (Optimized for both screen & paper print) */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-xl max-w-4xl mx-auto print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-300 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-700 font-black text-2xl tracking-tight">
              <Hotel className="w-7 h-7 text-amber-700" />
              <span>{hotel?.name || 'DURGA LODGE'}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xs leading-relaxed">
              {hotel?.address || 'Near Bus Stand, Station Road'}
              <br />
              {hotel?.city || 'Bhubaneswar'}, {hotel?.state || 'Odisha'} - India
            </p>
            <div className="text-xs text-slate-600 mt-1 space-y-0.5">
              <p>Phone: {hotel?.phone || '+91 94370 12345'}</p>
              <p>Email: {hotel?.email || 'stay@durgalodge.in'}</p>
              {hotel?.gstNumber && (
                <p className="font-semibold text-slate-800">GSTIN: {hotel.gstNumber}</p>
              )}
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-900 font-bold text-xs uppercase tracking-wider rounded-md border border-amber-300">
              Tax Invoice / Bill of Supply
            </span>
            <p className="text-sm font-mono font-bold text-slate-800 pt-1">
              Invoice #{booking.bookingNumber}
            </p>
            <p className="text-xs text-slate-500">
              Date: {formatHotelDate(booking.createdAt)}
            </p>
            <p className="text-xs text-slate-500">
              Status: <span className="font-semibold uppercase">{booking.paymentStatus}</span>
            </p>
          </div>
        </div>

        {/* Bill To & Stay Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 py-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">
              Guest Information
            </p>
            <p className="text-sm font-bold text-slate-900">{booking.guest.fullName}</p>
            <p className="text-slate-600">Phone: {booking.guest.phone}</p>
            {booking.guest.email && <p className="text-slate-600">Email: {booking.guest.email}</p>}
            {booking.guest.city && (
              <p className="text-slate-600">
                City: {booking.guest.city}, {booking.guest.state}
              </p>
            )}
            {booking.guest.idType && (
              <p className="text-slate-600">
                ID: {booking.guest.idType} ({booking.guest.idNumber})
              </p>
            )}
          </div>

          <div>
            <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">
              Stay Details
            </p>
            <p className="text-slate-800">
              <span className="font-semibold">Room:</span> Room {booking.room.number} ({booking.room.type.name})
            </p>
            <p className="text-slate-800">
              <span className="font-semibold">Check-in:</span> {formatHotelDate(booking.checkInDate)} {booking.actualCheckIn ? `(${formatHotelTime(booking.actualCheckIn)})` : ''}
            </p>
            <p className="text-slate-800">
              <span className="font-semibold">Check-out:</span> {booking.checkoutDate ? `${formatHotelDate(booking.checkoutDate)} ${booking.actualCheckOut ? `(${formatHotelTime(booking.actualCheckOut)})` : ''}` : 'Open / Flexible'}
            </p>
            <p className="text-slate-800">
              <span className="font-semibold">Duration:</span> {booking.nights} Night(s) • {booking.adults} Adult(s), {booking.children} Child
            </p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Rate</th>
                <th className="p-3 text-center">Qty / Nights</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="p-3">
                  <p className="font-semibold text-slate-900">Room Accommodation</p>
                  <p className="text-slate-500 text-[11px]">
                    Room {booking.room.number} • {booking.room.type.name}
                  </p>
                </td>
                <td className="p-3 text-center font-mono">
                  {formatCurrency(booking.roomTariff)} / night
                </td>
                <td className="p-3 text-center font-mono">{booking.nights}</td>
                <td className="p-3 text-right font-mono font-semibold">
                  {formatCurrency(booking.roomTariff * booking.nights)}
                </td>
              </tr>

              {booking.extraCharges > 0 && (
                <tr>
                  <td className="p-3 font-semibold text-slate-900">Extra Services / Amenities (Daily)</td>
                  <td className="p-3 text-center font-mono">{formatCurrency(booking.extraCharges)} / day</td>
                  <td className="p-3 text-center font-mono">{booking.nights}</td>
                  <td className="p-3 text-right font-mono font-semibold">
                    {formatCurrency(booking.extraCharges * booking.nights)}
                  </td>
                </tr>
              )}

              {booking.discount > 0 && (
                <tr className="text-emerald-700">
                  <td className="p-3 font-semibold">Promotional / Special Discount (Daily)</td>
                  <td className="p-3 text-center font-mono">-{formatCurrency(booking.discount)} / day</td>
                  <td className="p-3 text-center font-mono">{booking.nights}</td>
                  <td className="p-3 text-right font-mono font-semibold">
                    -{formatCurrency(booking.discount * booking.nights)}
                  </td>
                </tr>
              )}

              {booking.tax > 0 && (
                <tr>
                  <td className="p-3 font-semibold text-slate-900">
                    Goods and Services Tax (GST {((booking.taxRate || 0) / 100).toFixed(1)}%)
                  </td>
                  <td className="p-3 text-center">—</td>
                  <td className="p-3 text-center">—</td>
                  <td className="p-3 text-right font-mono font-semibold">
                    {formatCurrency(booking.tax)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals & Payments Summary */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-slate-200">
          <div className="w-full sm:w-1/2 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Payments Received
            </p>
            {booking.payments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No payments recorded yet.</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {booking.payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{p.method}</span>
                      {p.reference && (
                        <span className="text-[10px] text-slate-500 block">Ref: {p.reference}</span>
                      )}
                    </div>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="w-full sm:w-1/2 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono">
                {formatCurrency((booking.roomTariff * booking.nights) + booking.extraCharges - booking.discount)}
              </span>
            </div>
            {booking.tax > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax (GST):</span>
                <span className="font-mono">{formatCurrency(booking.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">
              <span>Grand Total:</span>
              <span className="font-mono">{formatCurrency(booking.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Total Paid:</span>
              <span className="font-mono text-emerald-700 font-semibold">{formatCurrency(totalPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-300">
              <span className={balance > 0 ? 'text-rose-600' : 'text-slate-900'}>
                Balance Due:
              </span>
              <span className={`font-mono ${balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Footer / Terms */}
        <div className="mt-10 pt-6 border-t border-slate-300 text-[11px] text-slate-500 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
          <div className="max-w-md">
            <p className="font-semibold text-slate-700 mb-1">Terms & Conditions:</p>
            <p className="leading-relaxed">
              {hotel?.invoiceTerms ||
                'Valid Government Photo ID required at check-in. Standard checkout is 11:00 AM. Thank you for your patronage.'}
            </p>
          </div>
          <div className="text-center sm:text-right w-full sm:w-auto">
            <div className="h-12 border-b border-slate-400 w-40 sm:ml-auto mb-1"></div>
            <p className="font-semibold text-slate-700">Authorized Signatory</p>
            <p className="text-[10px] text-slate-400">DURGA LODGE</p>
          </div>
        </div>
      </div>
    </div>
  )
}

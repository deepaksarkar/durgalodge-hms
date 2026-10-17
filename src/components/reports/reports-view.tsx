// src/components/reports/reports-view.tsx
'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { formatHotelDate } from '@/lib/date-utils'
import { downloadCSV, downloadXLSX } from '@/lib/export-utils'
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  BedDouble,
  AlertCircle,
  FileText
} from 'lucide-react'

type TabType = 'revenue' | 'expenses' | 'pnl' | 'occupancy' | 'outstanding' | 'room-performance'

export function ReportsView({
  revenueReport,
  expenseReport,
  pnlReport,
  occupancyReport,
  outstandingReport,
  roomPerformanceReport,
}: {
  revenueReport: any
  expenseReport: any
  pnlReport: any
  occupancyReport: any
  outstandingReport: any
  roomPerformanceReport: any
}) {
  const [activeTab, setActiveTab] = useState<TabType>('revenue')

  // CSV / XLSX Export Handlers
  const handleExport = (format: 'csv' | 'xlsx') => {
    let dataToExport: any[] = []
    let filename = `durga_lodge_${activeTab}_report_${new Date().toISOString().split('T')[0]}`

    if (activeTab === 'revenue') {
      dataToExport = revenueReport.bookings.map((b: any) => ({
        Booking_Ref: b.bookingNumber,
        Guest_Name: b.guest.fullName,
        Guest_Phone: b.guest.phone,
        Room: `Room ${b.room.number}`,
        Room_Type: b.room.type.name,
        Check_In: formatHotelDate(b.checkInDate),
        Check_Out: formatHotelDate(b.checkoutDate),
        Nights: b.nights,
        Total_Amount_INR: b.totalAmount / 100,
        Tax_INR: b.tax / 100,
        Discount_INR: b.discount / 100,
        Status: b.status,
        Payment_Status: b.paymentStatus,
      }))
    } else if (activeTab === 'expenses') {
      dataToExport = expenseReport.expenses.map((e: any) => ({
        Date: formatHotelDate(e.date),
        Category: e.category.name,
        Vendor: e.vendor || 'Direct Payee',
        Amount_INR: e.amount / 100,
        Payment_Method: e.method,
        Reference: e.reference || '',
        Recorded_By: e.createdBy.name,
        Notes: e.notes || '',
      }))
    } else if (activeTab === 'occupancy') {
      dataToExport = [
        {
          Metric: 'Occupancy Rate (%)',
          Value: `${occupancyReport.occupancyRate}%`,
        },
        {
          Metric: 'Average Daily Rate (ADR)',
          Value: `₹${(occupancyReport.adr / 100).toFixed(2)}`,
        },
        {
          Metric: 'Revenue Per Available Room (RevPAR)',
          Value: `₹${(occupancyReport.revpar / 100).toFixed(2)}`,
        },
        {
          Metric: 'Total Rooms',
          Value: occupancyReport.totalRooms,
        },
        {
          Metric: 'Available Room Nights',
          Value: occupancyReport.availableRoomNights,
        },
        {
          Metric: 'Occupied Room Nights',
          Value: occupancyReport.occupiedRoomNights,
        },
      ]
    } else if (activeTab === 'outstanding') {
      dataToExport = outstandingReport.records.map((r: any) => ({
        Booking_Ref: r.bookingNumber,
        Guest_Name: r.guest.fullName,
        Phone: r.guest.phone,
        Room: `Room ${r.room.number}`,
        Total_Bill_INR: r.totalAmount / 100,
        Paid_To_Date_INR: r.totalPaid / 100,
        Balance_Due_INR: r.balance / 100,
        Status: r.status,
      }))
    } else if (activeTab === 'room-performance') {
      dataToExport = roomPerformanceReport.performance.map((r: any) => ({
        Room_Number: r.number,
        Floor: r.floor,
        Room_Type: r.typeName,
        Base_Tariff_INR: r.baseTariff / 100,
        Nights_Occupied: r.nightsOccupied,
        Occupancy_Percent: `${r.occupancyRate}%`,
        Total_Revenue_INR: r.revenue / 100,
        Average_Rate_INR: r.averageRate / 100,
      }))
    }

    if (dataToExport.length === 0) {
      alert('No data to export for this view.')
      return
    }

    if (format === 'csv') {
      downloadCSV(dataToExport, filename)
    } else {
      downloadXLSX(dataToExport, filename, activeTab.toUpperCase())
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-amber-500" />
            <span>Financial & Occupancy Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audited financial statements, ADR/RevPAR analytics, outstanding folios, and Excel/CSV export.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => handleExport('csv')}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-700/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* Report Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3 text-xs font-semibold">
        {[
          { id: 'revenue', label: 'Revenue Report' },
          { id: 'expenses', label: 'Expense Report' },
          { id: 'pnl', label: 'Profit & Loss (P&L)' },
          { id: 'occupancy', label: 'Occupancy, ADR & RevPAR' },
          { id: 'outstanding', label: 'Outstanding Receivables' },
          { id: 'room-performance', label: 'Room Performance' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`px-3.5 py-2 rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: REVENUE REPORT */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Gross Booking Value</p>
              <p className="text-xl font-bold font-mono text-white mt-1">
                {formatCurrency(revenueReport.summary.totalGrossRevenue)}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Collections to Date</p>
              <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {formatCurrency(revenueReport.summary.totalCollected)}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">GST Collected</p>
              <p className="text-xl font-bold font-mono text-slate-200 mt-1">
                {formatCurrency(revenueReport.summary.totalTax)}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Outstanding Balances</p>
              <p className="text-xl font-bold font-mono text-rose-400 mt-1">
                {formatCurrency(revenueReport.summary.totalOutstanding)}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Ref #</th>
                    <th className="p-3.5">Guest</th>
                    <th className="p-3.5">Room</th>
                    <th className="p-3.5">Stay Dates</th>
                    <th className="p-3.5">Gross Total</th>
                    <th className="p-3.5">Tax (GST)</th>
                    <th className="p-3.5">Paid</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {revenueReport.bookings.map((b: any) => {
                    const paid = b.payments.reduce((acc: number, p: any) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
                    return (
                      <tr key={b.id} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-amber-400">{b.bookingNumber}</td>
                        <td className="p-3.5 font-semibold text-slate-200">{b.guest.fullName}</td>
                        <td className="p-3.5">Room {b.room.number}</td>
                        <td className="p-3.5 text-slate-400">
                          {formatHotelDate(b.checkInDate)} → {formatHotelDate(b.checkoutDate)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-white">
                          {formatCurrency(b.totalAmount)}
                        </td>
                        <td className="p-3.5 font-mono text-slate-400">{formatCurrency(b.tax)}</td>
                        <td className="p-3.5 font-mono text-emerald-400 font-semibold">{formatCurrency(paid)}</td>
                        <td className="p-3.5 uppercase font-bold text-[10px] text-slate-400">{b.status}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: EXPENSES REPORT */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Expenses</p>
              <p className="text-xl font-bold font-mono text-rose-400 mt-1">
                {formatCurrency(expenseReport.summary.totalExpenses)}
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Expense Entries Count</p>
              <p className="text-xl font-bold font-mono text-white mt-1">
                {expenseReport.summary.count} Entries
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Categories Active</p>
              <p className="text-xl font-bold font-mono text-amber-400 mt-1">
                {Object.keys(expenseReport.summary.byCategory).length}
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Method</th>
                    <th className="p-3.5">Reference</th>
                    <th className="p-3.5">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {expenseReport.expenses.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-medium text-slate-300">{formatHotelDate(e.date)}</td>
                      <td className="p-3.5 font-semibold text-amber-400">{e.category.name}</td>
                      <td className="p-3.5 text-slate-200">{e.vendor || '—'}</td>
                      <td className="p-3.5 font-mono font-bold text-rose-400">{formatCurrency(e.amount)}</td>
                      <td className="p-3.5 font-mono text-slate-300">{e.method}</td>
                      <td className="p-3.5 font-mono text-slate-500">{e.reference || '—'}</td>
                      <td className="p-3.5 text-slate-400">{e.createdBy.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: P&L */}
      {activeTab === 'pnl' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl mx-auto shadow-2xl space-y-6 text-xs">
          <div className="border-b border-slate-800 pb-4 text-center">
            <h3 className="text-xl font-bold text-white">Statement of Profit & Loss</h3>
            <p className="text-slate-400 text-xs mt-1">DURGA LODGE • Accrual & Cash Basis</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-bold text-amber-400 uppercase tracking-wider">Revenue / Inflows</h4>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-300">Gross Accommodation Revenue:</span>
                <span className="font-mono font-bold text-white">
                  {formatCurrency(pnlReport.revenue.totalGrossRevenue)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-300">GST Taxes Collected:</span>
                <span className="font-mono text-slate-400">{formatCurrency(pnlReport.revenue.totalTax)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-rose-400 uppercase tracking-wider">Operating Expenses</h4>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-300">Total Operating Expenses:</span>
                <span className="font-mono font-bold text-rose-400">
                  -{formatCurrency(pnlReport.expense.totalExpenses)}
                </span>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-200">Net Operating Result:</span>
                <span
                  className={`font-mono text-lg ${
                    pnlReport.netOperatingResult >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(pnlReport.netOperatingResult)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-900">
                <span className="text-slate-400">Net Cash Flow (Collected - Cash Expenses):</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(pnlReport.netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: OCCUPANCY, ADR & RevPAR */}
      {activeTab === 'occupancy' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                Occupancy Rate
              </span>
              <h3 className="text-3xl font-black text-amber-400 mt-1 font-mono">
                {occupancyReport.occupancyRate}%
              </h3>
              <p className="text-[11px] text-slate-500 mt-2">
                {occupancyReport.occupiedRoomNights} of {occupancyReport.availableRoomNights} room nights sold
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                Average Daily Rate (ADR)
              </span>
              <h3 className="text-3xl font-black text-emerald-400 mt-1 font-mono">
                {formatCurrency(occupancyReport.adr)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-2">
                Formula: Room Revenue ÷ Rooms Sold
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
                Revenue Per Available Room (RevPAR)
              </span>
              <h3 className="text-3xl font-black text-sky-400 mt-1 font-mono">
                {formatCurrency(occupancyReport.revpar)}
              </h3>
              <p className="text-[11px] text-slate-500 mt-2">
                Formula: Room Revenue ÷ Available Room Nights
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-xs">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Hotel Capacity Metrics
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Total Active Rooms:</span>
                <span className="text-lg font-bold text-white mt-1 block">{occupancyReport.totalRooms} rooms</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Period Duration:</span>
                <span className="text-lg font-bold text-white mt-1 block">{occupancyReport.period.daysInPeriod} days</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Available Inventory:</span>
                <span className="text-lg font-bold text-white mt-1 block">{occupancyReport.availableRoomNights} room-nights</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Total Room Revenue:</span>
                <span className="text-lg font-bold text-amber-400 mt-1 block font-mono">
                  {formatCurrency(occupancyReport.totalRoomRevenue)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: OUTSTANDING PAYMENTS */}
      {activeTab === 'outstanding' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Receivables Pending</p>
              <p className="text-2xl font-black font-mono text-rose-400 mt-1">
                {formatCurrency(outstandingReport.totalOutstanding)}
              </p>
            </div>
            <span className="px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold">
              {outstandingReport.count} Folios Pending
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Booking #</th>
                    <th className="p-3.5">Guest Name</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Room</th>
                    <th className="p-3.5">Total Bill</th>
                    <th className="p-3.5">Paid So Far</th>
                    <th className="p-3.5">Balance Owed</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {outstandingReport.records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-amber-400">{r.bookingNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-200">{r.guest.fullName}</td>
                      <td className="p-3.5 font-mono text-slate-400">{r.guest.phone}</td>
                      <td className="p-3.5">Room {r.room.number}</td>
                      <td className="p-3.5 font-mono text-slate-300">{formatCurrency(r.totalAmount)}</td>
                      <td className="p-3.5 font-mono text-emerald-400">{formatCurrency(r.totalPaid)}</td>
                      <td className="p-3.5 font-mono font-bold text-rose-400">{formatCurrency(r.balance)}</td>
                      <td className="p-3.5 uppercase font-bold text-[10px] text-amber-400">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: ROOM PERFORMANCE */}
      {activeTab === 'room-performance' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Room #</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Base Tariff</th>
                  <th className="p-3.5">Nights Sold</th>
                  <th className="p-3.5">Occupancy Rate</th>
                  <th className="p-3.5">Total Revenue</th>
                  <th className="p-3.5">Average Realized Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {roomPerformanceReport.performance.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-white">Room {r.number} (Floor {r.floor})</td>
                    <td className="p-3.5 text-slate-300">{r.typeName}</td>
                    <td className="p-3.5 font-mono text-slate-400">{formatCurrency(r.baseTariff)}</td>
                    <td className="p-3.5 font-bold text-slate-200">{r.nightsOccupied} nights</td>
                    <td className="p-3.5 font-mono font-bold text-amber-400">{r.occupancyRate}%</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-400">{formatCurrency(r.revenue)}</td>
                    <td className="p-3.5 font-mono text-slate-300">{formatCurrency(r.averageRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

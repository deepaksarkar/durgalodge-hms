// src/app/(dashboard)/revenue/page.tsx
import React from 'react'
import { getRevenueReport, getProfitAndLossReport } from '@/server/actions/report-actions'
import { formatCurrency } from '@/lib/currency'
import { IndianRupee, TrendingUp, DollarSign, AlertCircle, ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function RevenuePage() {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  const [revenueData, pnlData] = await Promise.all([
    getRevenueReport(),
    getProfitAndLossReport(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <IndianRupee className="w-7 h-7 text-amber-500" />
            <span>Revenue & Financial Performance</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Distinction between Recognized Booking Revenue, Cash Collections, Operating Profit, and Cash Flow.
          </p>
        </div>

        <Link
          href="/reports"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl self-start sm:self-auto"
        >
          View Full Financial Reports →
        </Link>
      </div>

      {/* Accounting Revenue vs Cash Flow Clarity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Accrual / Recognized Financials */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md">
                Accrual Accounting View
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Recognized Revenue & Net Result</h3>
            </div>
            <TrendingUp className="w-6 h-6 text-amber-500" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Gross Booking Revenue:</span>
              <span className="font-mono text-base font-bold text-white">
                {formatCurrency(revenueData.summary.totalGrossRevenue)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Total Operational Expenses:</span>
              <span className="font-mono text-base font-bold text-rose-400">
                -{formatCurrency(pnlData.expense.totalExpenses)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200">Net Operating Result:</span>
              <span
                className={`font-mono text-lg font-black ${
                  pnlData.netOperatingResult >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(pnlData.netOperatingResult)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Recognized revenue represents the value of all active or completed bookings.
          </p>
        </div>

        {/* Card 2: Cash Flow View */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md">
                Cash Flow View
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Cash Collected & Liquidity</h3>
            </div>
            <Wallet className="w-6 h-6 text-emerald-500" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Total Payments Collected:</span>
              <span className="font-mono text-base font-bold text-emerald-400">
                {formatCurrency(revenueData.summary.totalCollected)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-800/80">
              <span className="text-slate-400">Outstanding Receivables (Owed by Guests):</span>
              <span className="font-mono text-base font-bold text-amber-400">
                {formatCurrency(revenueData.summary.totalOutstanding)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="font-bold text-slate-200">Net Cash Flow:</span>
              <span
                className={`font-mono text-lg font-black ${
                  pnlData.netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(pnlData.netCashFlow)}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            Net cash flow represents actual cash and digital deposits minus cash outflows.
          </p>
        </div>
      </div>

      {/* Tax & Discount Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Total GST (Tax)</p>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {formatCurrency(revenueData.summary.totalTax)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Computed based on configured 12% GST</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Discounts Given</p>
          <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
            {formatCurrency(revenueData.summary.totalDiscounts)}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Customer loyalty & promotions</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Bookings Count</p>
          <p className="text-xl font-bold text-amber-400 mt-1">
            {revenueData.summary.count} Bookings
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Completed & active bookings</p>
        </div>
      </div>
    </div>
  )
}

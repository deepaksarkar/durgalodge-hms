// src/components/dashboard/dashboard-view.tsx
'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import {
  IndianRupee,
  Receipt,
  TrendingUp,
  BedDouble,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Layers,
  Percent
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid
} from 'recharts'
import { TimeRangeFilter } from '@/server/actions/dashboard-actions'
import { useRouter, useSearchParams } from 'next/navigation'

const COLORS = ['#d97706', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b']

export function DashboardView({ data }: { data: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentRange = (searchParams.get('range') as TimeRangeFilter) || 'today'
  const [isMounted, setIsMounted] = useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleRangeChange = (range: TimeRangeFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('range', range)
    router.push(`/dashboard?${params.toString()}`)
  }

  const { kpis, charts } = data

  return (
    <div className="space-y-6">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>DURGA LODGE</span>
            <span className="text-amber-500 font-mono text-sm px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              Operations Center
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial and operational metrics calculated directly from PostgreSQL.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => handleRangeChange(item.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                currentRange === item.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top Row: Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Recognized Revenue
              </p>
              <h3 className="text-2xl font-black text-white mt-1 font-mono">
                {formatCurrency(kpis.recognizedRevenuePaise)}
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Cash Collected:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {formatCurrency(kpis.totalCollectedPaise)}
            </span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Expenses
              </p>
              <h3 className="text-2xl font-black text-rose-400 mt-1 font-mono">
                {formatCurrency(kpis.totalExpensesPaise)}
              </h3>
            </div>
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Cash Flow:</span>
            <span className={`font-mono font-semibold ${kpis.cashFlowPaise >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatCurrency(kpis.cashFlowPaise)}
            </span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Net Operating Result
              </p>
              <h3 className={`text-2xl font-black mt-1 font-mono ${kpis.netOperatingProfitPaise >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatCurrency(kpis.netOperatingProfitPaise)}
              </h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Pending Receivables:</span>
            <span className="font-mono text-amber-400 font-semibold">
              {formatCurrency(kpis.pendingPaymentsPaise)}
            </span>
          </div>
        </div>

        {/* Occupancy */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Occupancy
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1 flex items-baseline gap-1">
                <span>{kpis.occupancyRate}%</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({kpis.occupiedRooms}/{kpis.totalRooms} rooms)
                </span>
              </h3>
            </div>
            <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Available Rooms:</span>
            <span className="font-mono text-emerald-400 font-semibold">
              {kpis.availableRooms} rooms
            </span>
          </div>
        </div>
      </div>

      {/* Operations Quick Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Check-Ins</p>
            <p className="text-lg font-bold text-white">{kpis.checkInsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Check-Outs</p>
            <p className="text-lg font-bold text-white">{kpis.checkOutsCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Bookings Created</p>
            <p className="text-lg font-bold text-white">{kpis.bookingsCreatedCount}</p>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Cleaning / Maint</p>
            <p className="text-lg font-bold text-white">
              {kpis.cleaningRooms + kpis.maintenanceRooms}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Row: Revenue vs Expense Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <span>Revenue & Expenses Trend</span>
              </h3>
              <p className="text-xs text-slate-400">Daily collections vs operational expenses</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {!isMounted ? (
              <div className="h-full w-full bg-slate-950/40 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-600">
                Loading analytics trend...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(val: any) => [`₹${val}`, '']}
                  />
                  <Area type="monotone" dataKey="revenueRupees" name="Revenue" stroke="#d97706" fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="expenseRupees" name="Expenses" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-emerald-500" />
                <span>Payment Methods</span>
              </h3>
              <p className="text-xs text-slate-400">Share of collections in period</p>
            </div>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            {!isMounted ? (
              <div className="h-full w-full bg-slate-950/40 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-600">
                Loading payment methods...
              </div>
            ) : charts.paymentsByMethod.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No collections in this period</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.paymentsByMethod}
                    dataKey="amountRupees"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {charts.paymentsByMethod.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(v: any) => [`₹${v}`, 'Collected']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Room Performance & Booking Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Rooms by Revenue */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Revenue by Room</span>
              </h3>
              <p className="text-xs text-slate-400">Top revenue generating rooms</p>
            </div>
          </div>

          <div className="h-64 w-full">
            {!isMounted ? (
              <div className="h-full w-full bg-slate-950/40 rounded-xl animate-pulse flex items-center justify-center text-xs text-slate-600">
                Loading room metrics...
              </div>
            ) : charts.revenueByRoom.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                No room revenue recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.revenueByRoom} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="roomNumber" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }}
                    formatter={(v: any) => [`₹${v}`, 'Revenue']}
                  />
                  <Bar dataKey="revenueRupees" fill="#d97706" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Booking Sources Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-500" />
                <span>Booking Sources</span>
              </h3>
              <p className="text-xs text-slate-400">Walk-in, Phone, WhatsApp, OTA</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {charts.bookingSources.map((source: any, i: number) => (
              <div key={source.name} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  {source.name}
                </p>
                <p className="text-xl font-bold text-white mt-1">{source.value}</p>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: COLORS[i % COLORS.length],
                      width: `${Math.min(100, source.value * 20)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// src/components/layout/app-shell.tsx
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  BedDouble,
  CalendarCheck,
  UserCheck,
  UserX,
  Users,
  IndianRupee,
  Receipt,
  BarChart3,
  Settings,
  ShieldAlert,
  Menu,
  X,
  Hotel,
  LogOut,
  Clock,
  UserCog,
  CreditCard,
  Building2
} from 'lucide-react'
import { logoutAction } from '@/server/actions/auth-actions'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  category?: 'Operations' | 'Finance' | 'Reports' | 'Administration'
  allowedRoles?: string[]
}

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
  
  // Operations
  { title: 'Rooms Grid', href: '/rooms', icon: BedDouble, category: 'Operations', allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTION', 'STAFF'] },
  { title: 'Bookings', href: '/bookings', icon: CalendarCheck, category: 'Operations', allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
  { title: 'Check-Ins', href: '/check-ins', icon: UserCheck, category: 'Operations', allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
  { title: 'Check-Outs', href: '/check-outs', icon: UserX, category: 'Operations', allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
  { title: 'Guests', href: '/guests', icon: Users, category: 'Operations', allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
  
  // Finance
  { title: 'Revenue & P&L', href: '/revenue', icon: IndianRupee, category: 'Finance', allowedRoles: ['ADMIN', 'MANAGER'] },
  { title: 'Payments', href: '/payments', icon: CreditCard, category: 'Finance', allowedRoles: ['ADMIN', 'MANAGER', 'RECEPTION'] },
  { title: 'Expenses', href: '/expenses', icon: Receipt, category: 'Finance', allowedRoles: ['ADMIN', 'MANAGER'] },
  { title: 'Daily Closing', href: '/daily-closing', icon: Clock, category: 'Finance', allowedRoles: ['ADMIN', 'MANAGER'] },
  
  // Reports
  { title: 'Reports & Analytics', href: '/reports', icon: BarChart3, category: 'Reports', allowedRoles: ['ADMIN', 'MANAGER'] },
  
  // Administration
  { title: 'Users & Staff', href: '/users', icon: UserCog, category: 'Administration', allowedRoles: ['ADMIN'] },
  { title: 'Hotel Settings', href: '/settings', icon: Settings, category: 'Administration', allowedRoles: ['ADMIN', 'MANAGER'] },
  { title: 'Audit Trail', href: '/audit-log', icon: ShieldAlert, category: 'Administration', allowedRoles: ['ADMIN'] },
]

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name: string; role: string; email: string }
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const renderNavGroup = (categoryName?: string) => {
    const items = navItems.filter((i) => {
      const matchCategory = i.category === categoryName
      const matchRole = !i.allowedRoles || i.allowedRoles.includes(user.role)
      return matchCategory && matchRole
    })

    if (items.length === 0) return null

    return (
      <div className="mb-4">
        {categoryName && (
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            {categoryName}
          </p>
        )}
        <nav className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2 font-bold text-amber-500 text-base">
          <Hotel className="w-5 h-5 text-amber-500" />
          <span>DURGA LODGE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
            {user.role}
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block fixed md:sticky top-0 h-screen z-30 bg-slate-900 border-r border-slate-800 w-full md:w-64 shrink-0 flex flex-col justify-between overflow-y-auto p-4 transition-all`}
      >
        <div>
          {/* Header Branding */}
          <div className="hidden md:flex items-center gap-3 px-2 py-3 mb-4 border-b border-slate-800">
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-500 border border-amber-500/20">
              <Hotel className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-slate-100 text-sm leading-tight">
                DURGA LODGE
              </h1>
              <p className="text-[11px] text-slate-400">Hotel Management System</p>
            </div>
          </div>

          {/* Navigation Items */}
          {renderNavGroup(undefined)}
          {renderNavGroup('Operations')}
          {renderNavGroup('Finance')}
          {renderNavGroup('Reports')}
          {renderNavGroup('Administration')}
        </div>

        {/* User Footer Card */}
        <div className="pt-4 border-t border-slate-800 mt-auto">
          <div className="flex items-center justify-between bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] text-amber-400 font-mono tracking-wider">{user.role}</span>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
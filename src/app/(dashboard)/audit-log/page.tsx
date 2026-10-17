// src/app/(dashboard)/audit-log/page.tsx
import React from 'react'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatHotelDateTime } from '@/lib/date-utils'
import { ShieldAlert, User, ShieldCheck, Clock, Terminal } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>
}) {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const params = await searchParams
  const where: any = {}
  if (params.entity && params.entity !== 'ALL') {
    where.entity = params.entity
  }

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: { name: true, role: true, email: true },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-amber-500" />
            <span>Immutable Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tamper-proof compliance log tracking security events, financial transactions, check-ins, and user actions.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Admin-Only Security Access</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Timestamp (IST)</th>
                <th className="p-4">Action</th>
                <th className="p-4">Staff Member</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Entity ID</th>
                <th className="p-4">Context Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono text-slate-300">
                      {formatHotelDateTime(log.timestamp)}
                    </td>

                    <td className="p-4">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-400">
                        {log.action}
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="font-semibold text-slate-200 block">{log.user.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{log.user.role}</span>
                    </td>

                    <td className="p-4 font-semibold text-slate-300">
                      {log.entity}
                    </td>

                    <td className="p-4 font-mono text-[10px] text-slate-500 truncate max-w-xs">
                      {log.entityId}
                    </td>

                    <td className="p-4">
                      <pre className="font-mono text-[10px] text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 max-w-sm overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
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

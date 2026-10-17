// src/components/admin/users-client-view.tsx
'use client'

import React, { useState } from 'react'
import { Role } from '@prisma/client'
import { formatHotelDate } from '@/lib/date-utils'
import { createUser, toggleUserStatus } from '@/server/actions/user-actions'
import { UserCog, Plus, ShieldCheck, UserX, UserCheck, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function UsersClientView({
  initialUsers,
  currentUserId,
}: {
  initialUsers: any[]
  currentUserId: string
}) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [showAddModal, setShowAddModal] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('RECEPTION')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      await createUser({ name, email, password, role })
      setShowAddModal(false)
      setName('')
      setEmail('')
      setPassword('')
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (userId: string) => {
    try {
      await toggleUserStatus(userId)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to update user status')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCog className="w-7 h-7 text-amber-500" />
            <span>Staff & Access Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Role-Based Access Control (RBAC): Admin, Manager, Reception, Housekeeping Staff.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null)
            setShowAddModal(true)
          }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Email</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-white text-sm">{u.name}</td>
                  <td className="p-4 font-mono text-slate-300">{u.email}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md font-mono font-bold text-[10px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{formatHotelDate(u.createdAt)}</td>
                  <td className="p-4 text-right">
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => handleToggle(u.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          u.isActive
                            ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                        }`}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Add New Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Sahu"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="anand@durgalodge.com"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Password (min 6 chars) *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role Permission Level *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  <option value="RECEPTION">RECEPTION (Bookings, Check-In/Out, Payments)</option>
                  <option value="MANAGER">MANAGER (Operations, Finance & Reports)</option>
                  <option value="STAFF">STAFF (Room Cleaning & Maintenance only)</option>
                  <option value="ADMIN">ADMIN (Full System Administrator)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

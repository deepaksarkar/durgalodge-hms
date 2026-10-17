// src/components/guests/guests-view.tsx
'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { formatHotelDate } from '@/lib/date-utils'
import { createGuest, updateGuest, getGuestProfile, deleteGuest } from '@/server/actions/guest-actions'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  History,
  XCircle,
  Eye,
  IndianRupee,
  ShieldCheck,
  CreditCard,
  Trash2
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function GuestsView({ initialData, userRole }: { initialData: any; userRole?: string }) {
  const router = useRouter()
  const [guests, setGuests] = useState(initialData.guests)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedGuestProfile, setSelectedGuestProfile] = useState<any | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleDeleteGuest = async (guest: any) => {
    const confirmMsg = `Are you sure you want to permanently delete guest "${guest.fullName}"?\n\nWARNING: This will permanently delete all of their reservations, payment records, and reset any occupied rooms to Available.`
    if (!window.confirm(confirmMsg)) return

    try {
      await deleteGuest(guest.id)
      setGuests((prev: any[]) => prev.filter((g) => g.id !== guest.id))
      if (selectedGuestProfile?.id === guest.id) {
        setSelectedGuestProfile(null)
      }
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete guest')
    }
  }

  // Form State
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('Odisha')
  const [idType, setIdType] = useState('Aadhaar')
  const [idNumber, setIdNumber] = useState('')
  const [notes, setNotes] = useState('')

  const filteredGuests = guests.filter((g: any) => {
    const s = search.toLowerCase().trim()
    if (!s) return true
    return (
      g.fullName.toLowerCase().includes(s) ||
      g.phone.includes(s) ||
      g.email?.toLowerCase().includes(s) ||
      g.city?.toLowerCase().includes(s) ||
      g.idNumber?.toLowerCase().includes(s)
    )
  })

  const handleCreateGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      await createGuest({
        fullName,
        phone,
        email: email || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        idType: idType || undefined,
        idNumber: idNumber || undefined,
        notes: notes || undefined,
      })

      setShowAddModal(false)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create guest')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenProfile = async (guestId: string) => {
    setLoadingProfile(true)
    try {
      const profile = await getGuestProfile(guestId)
      setSelectedGuestProfile(profile)
    } catch (err) {
      alert('Failed to load guest history')
    } finally {
      setLoadingProfile(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-amber-500" />
            <span>Guest Directory & History</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            CRM database, stay counts, lifetime expenditure, identification documents, and booking history.
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
          <span>Add New Guest</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Guest Name, Phone, Aadhaar/ID, City..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Guests Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Guest Name</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Location</th>
                <th className="p-4">Total Stays</th>
                <th className="p-4">Lifetime Spent</th>
                <th className="p-4">Last Visit</th>
                <th className="p-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No guests found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g: any) => (
                  <tr key={g.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-white text-sm block">{g.fullName}</span>
                      {g.idType && (
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          {g.idType}: {g.idNumber || '—'}
                        </span>
                      )}
                    </td>

                    <td className="p-4 space-y-0.5">
                      <p className="text-slate-200 font-mono flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{g.phone}</span>
                      </p>
                      {g.email && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{g.email}</span>
                        </p>
                      )}
                    </td>

                    <td className="p-4 text-slate-300">
                      {g.city ? `${g.city}, ${g.state || ''}` : '—'}
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-200 px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800">
                        {g.totalStays} stay(s)
                      </span>
                    </td>

                    <td className="p-4 font-mono font-bold text-emerald-400">
                      {formatCurrency(g.totalSpent)}
                    </td>

                    <td className="p-4 text-slate-400">
                      {formatHotelDate(g.lastStay)}
                    </td>

                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleOpenProfile(g.id)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors flex items-center gap-1.5 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View History</span>
                        </button>
                        {userRole === 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteGuest(g)}
                            title="Delete Guest & All Records (Admin)"
                            className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD GUEST MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <span>Register New Guest</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateGuest} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priyabrata Mohanty"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9437..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@gmail.com"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bhubaneswar"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Odisha"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">ID Document Type</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="PAN">PAN Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Passport">Passport</option>
                    <option value="Voter ID">Voter ID</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">ID Number</label>
                  <input
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Document #"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>
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
                  {isSubmitting ? 'Saving...' : 'Register Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GUEST PROFILE & STAY HISTORY MODAL */}
      {selectedGuestProfile && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-start border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedGuestProfile.fullName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Phone: {selectedGuestProfile.phone} • {selectedGuestProfile.city || 'India'}
                </p>
              </div>
              <button
                onClick={() => setSelectedGuestProfile(null)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Lifetime Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Stays</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {selectedGuestProfile.totalStays}
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Spent</span>
                <span className="text-xl font-bold text-emerald-400 mt-1 block font-mono">
                  {formatCurrency(selectedGuestProfile.totalSpent)}
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Avg Duration</span>
                <span className="text-xl font-bold text-amber-400 mt-1 block">
                  {selectedGuestProfile.averageStay} nights
                </span>
              </div>
            </div>

            {/* Stay History List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-amber-500" />
                <span>Complete Stay & Payment History</span>
              </h4>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {selectedGuestProfile.bookings.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No bookings recorded.</p>
                ) : (
                  selectedGuestProfile.bookings.map((b: any) => {
                    const paid = b.payments.reduce((acc: number, p: any) => p.isRefund ? acc - p.amount : acc + p.amount, 0)

                    return (
                      <div
                        key={b.id}
                        className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">
                              #{b.bookingNumber}
                            </span>
                            <span className="font-bold text-white">Room {b.room.number}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                              {b.status}
                            </span>
                          </div>
                          <p className="text-slate-400 mt-1 text-[11px]">
                            {formatHotelDate(b.checkInDate)} → {formatHotelDate(b.checkoutDate)} ({b.nights} nights)
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="font-mono font-bold text-white">{formatCurrency(b.totalAmount)}</p>
                          <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                            Paid: {formatCurrency(paid)}
                          </p>
                          <Link
                            href={`/bookings/${b.id}/invoice`}
                            className="text-[10px] text-amber-400 hover:underline block mt-1"
                          >
                            View Invoice
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              {userRole === 'ADMIN' ? (
                <button
                  onClick={() => handleDeleteGuest(selectedGuestProfile)}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Guest & All Data</span>
                </button>
              ) : <div />}
              <button
                onClick={() => setSelectedGuestProfile(null)}
                className="px-4 py-2 bg-slate-800 text-slate-200 text-xs rounded-xl hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

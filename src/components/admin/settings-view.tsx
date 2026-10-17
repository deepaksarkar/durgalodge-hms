// src/components/admin/settings-view.tsx
'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { updateHotelSettings } from '@/server/actions/settings-actions'
import {
  createRoomType,
  updateRoomType,
  deleteRoomType,
  createRoom,
  updateRoomDetails,
  deleteRoom,
} from '@/server/actions/room-actions'
import {
  Settings,
  Hotel,
  BedDouble,
  Percent,
  Clock,
  Plus,
  XCircle,
  Save,
  CheckCircle,
  Building,
  Edit,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export function SettingsView({
  hotelSettings,
  roomTypes: initialRoomTypes,
  rooms: initialRooms = [],
  userRole,
}: {
  hotelSettings: any
  roomTypes: any[]
  rooms?: any[]
  userRole?: string
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)

  const [roomTypes, setRoomTypes] = useState(initialRoomTypes)
  const [rooms, setRooms] = useState(initialRooms)

  // Settings form
  const [name, setName] = useState(hotelSettings?.name || 'DURGA LODGE')
  const [phone, setPhone] = useState(hotelSettings?.phone || '')
  const [email, setEmail] = useState(hotelSettings?.email || '')
  const [address, setAddress] = useState(hotelSettings?.address || '')
  const [city, setCity] = useState(hotelSettings?.city || '')
  const [state, setState] = useState(hotelSettings?.state || '')
  const [gstNumber, setGstNumber] = useState(hotelSettings?.gstNumber || '')
  const [taxPercent, setTaxPercent] = useState(((hotelSettings?.taxPercentage || 1200) / 100).toString())
  const [checkInTime, setCheckInTime] = useState(hotelSettings?.checkInTime || '12:00')
  const [checkOutTime, setCheckOutTime] = useState(hotelSettings?.checkOutTime || '11:00')
  const [invoiceTerms, setInvoiceTerms] = useState(hotelSettings?.invoiceTerms || '')
  const [allowNegativeCheckout, setAllowNegativeCheckout] = useState(
    hotelSettings?.allowNegativeBalanceCheckout || false
  )

  // Modals
  const [showAddRoomType, setShowAddRoomType] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<any | null>(null)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any | null>(null)

  // Add Room Type Form
  const [rtName, setRtName] = useState('')
  const [rtTariff, setRtTariff] = useState('')
  const [rtCapacity, setRtCapacity] = useState(2)
  const [rtIsAC, setRtIsAC] = useState(false)
  const [rtIsBath, setRtIsBath] = useState(true)
  const [rtDesc, setRtDesc] = useState('')

  // Edit Room Type Form
  const [editRtName, setEditRtName] = useState('')
  const [editRtTariff, setEditRtTariff] = useState('')
  const [editRtCapacity, setEditRtCapacity] = useState(2)
  const [editRtIsAC, setEditRtIsAC] = useState(false)
  const [editRtIsBath, setEditRtIsBath] = useState(true)
  const [editRtDesc, setEditRtDesc] = useState('')

  // Add Room Form
  const [roomNumber, setRoomNumber] = useState('')
  const [roomFloor, setRoomFloor] = useState('1')
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id || '')

  // Edit Room Form
  const [editRoomNumber, setEditRoomNumber] = useState('')
  const [editRoomFloor, setEditRoomFloor] = useState('')
  const [editRoomTypeId, setEditRoomTypeId] = useState('')
  const [editRoomNotes, setEditRoomNotes] = useState('')

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSuccessMsg(false)
    try {
      const basisPoints = Math.round(parseFloat(taxPercent) * 100)
      await updateHotelSettings({
        name,
        phone,
        email,
        address,
        city,
        state,
        gstNumber,
        taxPercentage: basisPoints,
        checkInTime,
        checkOutTime,
        invoiceTerms,
        allowNegativeBalanceCheckout: allowNegativeCheckout,
      })
      setSuccessMsg(true)
      setTimeout(() => setSuccessMsg(false), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to update settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateRoomType = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await createRoomType({
        name: rtName,
        baseTariff: parseFloat(rtTariff),
        capacity: Number(rtCapacity),
        isAC: rtIsAC,
        isAttachedBath: rtIsBath,
        description: rtDesc,
      })
      setShowAddRoomType(false)
      setRtName('')
      setRtTariff('')
      setRtDesc('')
      setRoomTypes((prev) => [...prev, { ...res.roomType, _count: { rooms: 0 } }])
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to create room type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditRoomType = (rt: any) => {
    setEditingRoomType(rt)
    setEditRtName(rt.name)
    setEditRtTariff((rt.baseTariff / 100).toString())
    setEditRtCapacity(rt.capacity)
    setEditRtIsAC(rt.isAC)
    setEditRtIsBath(rt.isAttachedBath)
    setEditRtDesc(rt.description || '')
  }

  const handleUpdateRoomType = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoomType) return
    setIsSubmitting(true)
    try {
      const res = await updateRoomType(editingRoomType.id, {
        name: editRtName,
        baseTariff: parseFloat(editRtTariff),
        capacity: Number(editRtCapacity),
        isAC: editRtIsAC,
        isAttachedBath: editRtIsBath,
        description: editRtDesc,
      })
      setRoomTypes((prev) =>
        prev.map((item) =>
          item.id === editingRoomType.id ? { ...res.roomType, _count: item._count } : item
        )
      )
      setEditingRoomType(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to update room type')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRoomType = async (rt: any) => {
    const hasRooms = (rt._count?.rooms || 0) > 0
    let confirmMsg = `Are you sure you want to delete room category "${rt.name}"?`
    if (hasRooms) {
      confirmMsg += `\n\nWARNING: There are ${rt._count?.rooms} room(s) assigned to this category. Deleting this category will permanently cascade and delete all these rooms, their bookings, and their payment records!`
    }
    if (!window.confirm(confirmMsg)) return

    try {
      await deleteRoomType(rt.id, true)
      setRoomTypes((prev) => prev.filter((item) => item.id !== rt.id))
      setRooms((prev) => prev.filter((r) => r.typeId !== rt.id))
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete room category')
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await createRoom({
        number: roomNumber,
        floor: roomFloor,
        typeId: roomTypeId,
      })
      setShowAddRoom(false)
      setRoomNumber('')
      const selectedType = roomTypes.find((t) => t.id === roomTypeId)
      setRooms((prev) => [...prev, { ...res.room, type: selectedType }])
      setRoomTypes((prev) =>
        prev.map((t) =>
          t.id === roomTypeId ? { ...t, _count: { rooms: (t._count?.rooms || 0) + 1 } } : t
        )
      )
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to add room')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenEditRoom = (room: any) => {
    setEditingRoom(room)
    setEditRoomNumber(room.number)
    setEditRoomFloor(room.floor)
    setEditRoomTypeId(room.typeId)
    setEditRoomNotes(room.notes || '')
  }

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoom) return
    setIsSubmitting(true)
    try {
      const res = await updateRoomDetails({
        roomId: editingRoom.id,
        number: editRoomNumber,
        floor: editRoomFloor,
        typeId: editRoomTypeId,
        notes: editRoomNotes || undefined,
      })
      const selectedType = roomTypes.find((t) => t.id === editRoomTypeId)
      setRooms((prev) =>
        prev.map((item) =>
          item.id === editingRoom.id ? { ...res.room, type: selectedType } : item
        )
      )
      setEditingRoom(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to update room')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRoom = async (room: any) => {
    const confirmMsg = `Are you sure you want to permanently delete Room ${room.number}?\n\nWARNING: This will permanently delete the room, all its past/current reservations, and all associated payment records!`
    if (!window.confirm(confirmMsg)) return

    try {
      await deleteRoom(room.id)
      setRooms((prev) => prev.filter((item) => item.id !== room.id))
      setRoomTypes((prev) =>
        prev.map((t) =>
          t.id === room.typeId ? { ...t, _count: { rooms: Math.max(0, (t._count?.rooms || 1) - 1) } } : t
        )
      )
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete room')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="w-7 h-7 text-amber-500" />
            <span>Hotel Configuration & Room Setup</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Property metadata, GST taxation rates, check-in policies, room types, and dynamic room inventory.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddRoomType(true)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-500" />
            <span>Add Room Type</span>
          </button>
          <button
            onClick={() => setShowAddRoom(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Hotel settings updated successfully!</span>
        </div>
      )}

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Hotel className="w-5 h-5 text-amber-500" />
            <span>Hotel Property Information</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Hotel Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">GSTIN Number (Tax)</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="21AAAAA0000A1Z5"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
                />
              </div>
            </div>

            {/* Operating Times & Taxes */}
            <div className="pt-3 border-t border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-300 uppercase tracking-wider">
                Operating Timings & GST
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">e.g. 12.0 for 12%</span>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Standard Check-In</label>
                  <input
                    type="time"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Standard Check-Out</label>
                  <input
                    type="time"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Invoice Terms & Policy</label>
              <textarea
                rows={2}
                value={invoiceTerms}
                onChange={(e) => setInvoiceTerms(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="negCheck"
                checked={allowNegativeCheckout}
                onChange={(e) => setAllowNegativeCheckout(e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-amber-500"
              />
              <label htmlFor="negCheck" className="text-slate-300 font-semibold cursor-pointer">
                Allow Receptionist to check-out guests with unpaid balance (Otherwise Admin authorization required)
              </label>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Hotel Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Room Types Panel */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>Room Categories & Tariffs</span>
              </h3>
              <span className="text-[10px] text-slate-400">{roomTypes.length} Active</span>
            </div>

            <div className="space-y-3">
              {roomTypes.map((rt) => (
                <div key={rt.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-200">{rt.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        {rt.capacity} Guests • {rt.isAC ? 'AC' : 'Non-AC'} • {rt.isAttachedBath ? 'Attached Bath' : 'Common Bath'}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-amber-400">
                      {formatCurrency(rt.baseTariff)}/night
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900 flex justify-between items-center">
                    <span>{rt._count?.rooms || 0} room(s) assigned</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditRoomType(rt)}
                        title="Edit Category"
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {userRole === 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteRoomType(rt)}
                          title="Delete Category (Admin)"
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Room Inventory Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-xs">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-amber-500" />
              <span>Room Inventory Management</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Edit room specifications, reassign categories, or permanently delete rooms (Admin).
            </p>
          </div>
          <button
            onClick={() => setShowAddRoom(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Room</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3">Room #</th>
                <th className="p-3">Floor</th>
                <th className="p-3">Category</th>
                <th className="p-3">Tariff</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-bold text-slate-100">
                    Room {room.number}
                  </td>
                  <td className="p-3 text-slate-400">
                    Floor {room.floor}
                  </td>
                  <td className="p-3 text-slate-300">
                    {room.type?.name || 'Unassigned'}
                  </td>
                  <td className="p-3 font-mono text-amber-400">
                    {room.type ? formatCurrency(room.type.baseTariff) : '—'}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 uppercase">
                      {room.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditRoom(room)}
                        title="Edit Room"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {userRole === 'ADMIN' && (
                        <button
                          onClick={() => handleDeleteRoom(room)}
                          title="Delete Room & Cascade All Records (Admin)"
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD ROOM TYPE MODAL */}
      {showAddRoomType && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">New Room Category</h3>
              <button onClick={() => setShowAddRoomType(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoomType} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={rtName}
                  onChange={(e) => setRtName(e.target.value)}
                  placeholder="e.g. Executive Deluxe AC"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Base Tariff (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={rtTariff}
                    onChange={(e) => setRtTariff(e.target.value)}
                    placeholder="1500"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Guest Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={rtCapacity}
                    onChange={(e) => setRtCapacity(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rtIsAC}
                    onChange={(e) => setRtIsAC(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500"
                  />
                  <span>Air Conditioned (AC)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rtIsBath}
                    onChange={(e) => setRtIsBath(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500"
                  />
                  <span>Attached Bathroom</span>
                </label>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={rtDesc}
                  onChange={(e) => setRtDesc(e.target.value)}
                  placeholder="Amenities & bedding"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRoomType(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROOM TYPE MODAL */}
      {editingRoomType && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Edit Room Category</h3>
              <button onClick={() => setEditingRoomType(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoomType} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editRtName}
                  onChange={(e) => setEditRtName(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Base Tariff (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editRtTariff}
                    onChange={(e) => setEditRtTariff(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Guest Capacity</label>
                  <input
                    type="number"
                    min="1"
                    value={editRtCapacity}
                    onChange={(e) => setEditRtCapacity(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRtIsAC}
                    onChange={(e) => setEditRtIsAC(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500"
                  />
                  <span>Air Conditioned (AC)</span>
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editRtIsBath}
                    onChange={(e) => setEditRtIsBath(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-amber-500"
                  />
                  <span>Attached Bathroom</span>
                </label>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={editRtDesc}
                  onChange={(e) => setEditRtDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoomType(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {showAddRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Add New Room</h3>
              <button onClick={() => setShowAddRoom(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Room # *</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="e.g. 204"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Floor *</label>
                  <input
                    type="text"
                    required
                    value={roomFloor}
                    onChange={(e) => setRoomFloor(e.target.value)}
                    placeholder="2"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Room Category *</label>
                <select
                  value={roomTypeId}
                  onChange={(e) => setRoomTypeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} (₹{rt.baseTariff / 100}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddRoom(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20"
                >
                  Add Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROOM MODAL */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Edit Room {editingRoom.number}</h3>
              <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Room # *</label>
                  <input
                    type="text"
                    required
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Floor *</label>
                  <input
                    type="text"
                    required
                    value={editRoomFloor}
                    onChange={(e) => setEditRoomFloor(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Room Category *</label>
                <select
                  value={editRoomTypeId}
                  onChange={(e) => setEditRoomTypeId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                >
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} (₹{rt.baseTariff / 100}/night)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notes / Description</label>
                <input
                  type="text"
                  value={editRoomNotes}
                  onChange={(e) => setEditRoomNotes(e.target.value)}
                  placeholder="e.g. Garden view, extra bed"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

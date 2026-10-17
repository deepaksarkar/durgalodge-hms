// src/components/rooms/room-grid.tsx
'use client'

import React, { useState } from 'react'
import { RoomStatus } from '@prisma/client'
import { formatCurrency } from '@/lib/currency'
import {
  updateRoomStatus,
  deleteRoom,
  updateRoomDetails,
  createRoom,
} from '@/server/actions/room-actions'
import {
  BedDouble,
  CheckCircle2,
  Clock,
  Wrench,
  AlertOctagon,
  Sparkles,
  User,
  Calendar,
  XCircle,
  ChevronRight,
  Filter,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

const STATUS_CONFIG: Record<
  RoomStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  AVAILABLE: {
    label: 'AVAILABLE',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  OCCUPIED: {
    label: 'OCCUPIED',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
    icon: User,
  },
  RESERVED: {
    label: 'RESERVED',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    icon: Calendar,
  },
  CLEANING: {
    label: 'CLEANING',
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/30',
    icon: Sparkles,
  },
  MAINTENANCE: {
    label: 'MAINTENANCE',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/30',
    icon: Wrench,
  },
  OUT_OF_SERVICE: {
    label: 'OUT OF SERVICE',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    icon: AlertOctagon,
  },
}

export function RoomGrid({
  initialRooms,
  roomTypes = [],
  userRole,
}: {
  initialRooms: any[]
  roomTypes?: any[]
  userRole?: string
}) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null)
  const [updating, setUpdating] = useState(false)

  // Modals for add & edit
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingRoom, setEditingRoom] = useState<any | null>(null)

  // Add room state
  const [addNumber, setAddNumber] = useState('')
  const [addFloor, setAddFloor] = useState('1')
  const [addTypeId, setAddTypeId] = useState(roomTypes[0]?.id || '')

  // Edit room state
  const [editNumber, setEditNumber] = useState('')
  const [editFloor, setEditFloor] = useState('')
  const [editTypeId, setEditTypeId] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Status Summary KPI Counters
  const counts = {
    TOTAL: rooms.length,
    AVAILABLE: rooms.filter((r) => r.status === 'AVAILABLE').length,
    OCCUPIED: rooms.filter((r) => r.status === 'OCCUPIED').length,
    RESERVED: rooms.filter((r) => r.status === 'RESERVED').length,
    CLEANING: rooms.filter((r) => r.status === 'CLEANING').length,
    MAINTENANCE: rooms.filter((r) => r.status === 'MAINTENANCE').length,
  }

  const filteredRooms = rooms.filter((room) =>
    filterStatus === 'ALL' ? true : room.status === filterStatus
  )

  const handleStatusUpdate = async (newStatus: RoomStatus) => {
    if (!selectedRoom) return
    setUpdating(true)
    try {
      await updateRoomStatus({ roomId: selectedRoom.id, status: newStatus })
      setRooms((prev) =>
        prev.map((r) => (r.id === selectedRoom.id ? { ...r, status: newStatus } : r))
      )
      setSelectedRoom(null)
    } catch (err) {
      alert('Failed to update room status')
    } finally {
      setUpdating(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    try {
      const res = await createRoom({
        number: addNumber,
        floor: addFloor,
        typeId: addTypeId,
      })
      const selectedType = roomTypes.find((t) => t.id === addTypeId)
      setRooms((prev) => [...prev, { ...res.room, type: selectedType, bookings: [] }])
      setShowAddModal(false)
      setAddNumber('')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to create room')
    } finally {
      setUpdating(false)
    }
  }

  const handleOpenEdit = (room: any) => {
    setEditingRoom(room)
    setEditNumber(room.number)
    setEditFloor(room.floor)
    setEditTypeId(room.typeId || room.type?.id)
    setEditNotes(room.notes || '')
    setSelectedRoom(null)
  }

  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRoom) return
    setUpdating(true)
    try {
      const res = await updateRoomDetails({
        roomId: editingRoom.id,
        number: editNumber,
        floor: editFloor,
        typeId: editTypeId,
        notes: editNotes || undefined,
      })
      const selectedType = roomTypes.find((t) => t.id === editTypeId)
      setRooms((prev) =>
        prev.map((r) =>
          r.id === editingRoom.id
            ? { ...r, ...res.room, type: selectedType }
            : r
        )
      )
      setEditingRoom(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to update room')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteRoom = async (room: any) => {
    const confirmMsg = `Are you sure you want to permanently delete Room ${room.number}?\n\nWARNING: This will permanently delete the room, all its past/current reservations, and all associated payment records!`
    if (!window.confirm(confirmMsg)) return

    setUpdating(true)
    try {
      await deleteRoom(room.id)
      setRooms((prev) => prev.filter((r) => r.id !== room.id))
      setSelectedRoom(null)
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete room')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-400">
          Showing {filteredRooms.length} of {rooms.length} configured rooms
        </div>
        {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room</span>
          </button>
        )}
      </div>

      {/* Top Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`cursor-pointer p-4 rounded-xl border bg-slate-900 transition-all ${
            filterStatus === 'ALL' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-800'
          }`}
        >
          <p className="text-xs text-slate-400 font-medium">Total Rooms</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{counts.TOTAL}</p>
        </div>
        <div
          onClick={() => setFilterStatus('AVAILABLE')}
          className={`cursor-pointer p-4 rounded-xl border bg-slate-900 transition-all ${
            filterStatus === 'AVAILABLE' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-800'
          }`}
        >
          <p className="text-xs text-emerald-400 font-medium">Available</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{counts.AVAILABLE}</p>
        </div>
        <div
          onClick={() => setFilterStatus('OCCUPIED')}
          className={`cursor-pointer p-4 rounded-xl border bg-slate-900 transition-all ${
            filterStatus === 'OCCUPIED' ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-800'
          }`}
        >
          <p className="text-xs text-rose-400 font-medium">Occupied</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{counts.OCCUPIED}</p>
        </div>
        <div
          onClick={() => setFilterStatus('RESERVED')}
          className={`cursor-pointer p-4 rounded-xl border bg-slate-900 transition-all ${
            filterStatus === 'RESERVED' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-800'
          }`}
        >
          <p className="text-xs text-amber-400 font-medium">Reserved</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{counts.RESERVED}</p>
        </div>
        <div
          onClick={() => setFilterStatus('CLEANING')}
          className={`cursor-pointer p-4 rounded-xl border bg-slate-900 transition-all ${
            filterStatus === 'CLEANING' ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-800'
          }`}
        >
          <p className="text-xs text-sky-400 font-medium">Cleaning</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{counts.CLEANING}</p>
        </div>
        <div
          onClick={() => setFilterStatus('MAINTENANCE')}
          className={`cursor-pointer p-4 rounded-xl border bg-slate-900 transition-all ${
            filterStatus === 'MAINTENANCE' ? 'border-zinc-500 ring-1 ring-zinc-500' : 'border-slate-800'
          }`}
        >
          <p className="text-xs text-zinc-400 font-medium">Maintenance</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">{counts.MAINTENANCE}</p>
        </div>
      </div>

      {/* Main Room Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredRooms.map((room) => {
          const cfg = STATUS_CONFIG[room.status as RoomStatus] || STATUS_CONFIG.AVAILABLE
          const IconComponent = cfg.icon
          const currentBooking = room.bookings?.find(
            (b: any) => b.status === 'CHECKED_IN' || b.status === 'RESERVED'
          )

          return (
            <div
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 cursor-pointer transition-all shadow-md hover:shadow-xl relative flex flex-col justify-between"
            >
              {/* Card Header: Room Number, Floor, Status badge */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-tight text-slate-100">
                      {room.number}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      F{room.floor}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {room.type?.name || 'Standard'}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{cfg.label}</span>
                </div>
              </div>

              {/* Middle Section: Current Occupant Info */}
              <div className="my-2">
                {currentBooking ? (
                  <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800 text-xs">
                    <p className="font-semibold text-slate-200 truncate">
                      {currentBooking.guest.fullName}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Ph: {currentBooking.guest.phone}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic">
                    {room.notes || 'No active guest'}
                  </div>
                )}
              </div>

              {/* Bottom Row: Base Tariff */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Tariff</span>
                <span className="font-mono font-bold text-amber-400">
                  {room.type ? `${formatCurrency(room.type.baseTariff)}/night` : '—'}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Room Quick Action Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <span>Room {selectedRoom.number} Details</span>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    Floor {selectedRoom.floor}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Category: {selectedRoom.type?.name} • Tariff: {selectedRoom.type ? formatCurrency(selectedRoom.type.baseTariff) : '—'}
                </p>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Current Guest info & quick action links */}
            {selectedRoom.bookings?.[0] ? (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Current Occupant ({selectedRoom.bookings[0].status})
                    </p>
                    <p className="text-sm font-bold text-slate-100 mt-0.5">
                      {selectedRoom.bookings[0].guest.fullName}
                    </p>
                    <p className="text-xs text-slate-400">
                      Phone: {selectedRoom.bookings[0].guest.phone}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    Ref: {selectedRoom.bookings[0].bookingNumber}
                  </span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-900">
                  <a
                    href={`/bookings/${selectedRoom.bookings[0].id}/invoice`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                  >
                    View Invoice
                  </a>
                  {selectedRoom.bookings[0].status === 'CHECKED_IN' && (
                    <a
                      href="/check-outs"
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium"
                    >
                      Go to Check-Out
                    </a>
                  )}
                  {selectedRoom.bookings[0].status === 'RESERVED' && (
                    <a
                      href="/check-ins"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium"
                    >
                      Go to Check-In
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">No active reservation for this room</span>
                <a
                  href="/bookings"
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium"
                >
                  Create Booking
                </a>
              </div>
            )}

            {/* Quick Change Status Buttons */}
            <div>
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
                Change Status
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['AVAILABLE', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE'] as RoomStatus[]).map(
                  (status) => {
                    const isCurrent = selectedRoom.status === status
                    const cfg = STATUS_CONFIG[status]
                    return (
                      <button
                        key={status}
                        disabled={isCurrent || updating}
                        onClick={() => handleStatusUpdate(status)}
                        className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                          isCurrent
                            ? 'opacity-40 cursor-not-allowed border-slate-800 bg-slate-950 text-slate-500'
                            : `${cfg.bg} ${cfg.border}${cfg.text} hover:scale-105`
                        }`}
                      >
                        <span>{cfg.label}</span>
                      </button>
                    )
                  }
                )}
              </div>
            </div>

            {/* Admin / Manager Room Controls */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(userRole === 'ADMIN' || userRole === 'MANAGER') && (
                  <button
                    onClick={() => handleOpenEdit(selectedRoom)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Room</span>
                  </button>
                )}
                {userRole === 'ADMIN' && (
                  <button
                    onClick={() => handleDeleteRoom(selectedRoom)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Room</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ROOM MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Add New Room</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
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
                    value={addNumber}
                    onChange={(e) => setAddNumber(e.target.value)}
                    placeholder="e.g. 204"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Floor *</label>
                  <input
                    type="text"
                    required
                    value={addFloor}
                    onChange={(e) => setAddFloor(e.target.value)}
                    placeholder="2"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Room Category *</label>
                <select
                  value={addTypeId}
                  onChange={(e) => setAddTypeId(e.target.value)}
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
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
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
                    value={editNumber}
                    onChange={(e) => setEditNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Floor *</label>
                  <input
                    type="text"
                    required
                    value={editFloor}
                    onChange={(e) => setEditFloor(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Room Category *</label>
                <select
                  value={editTypeId}
                  onChange={(e) => setEditTypeId(e.target.value)}
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
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
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
                  disabled={updating}
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
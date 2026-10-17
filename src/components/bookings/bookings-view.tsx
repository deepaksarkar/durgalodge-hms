// src/components/bookings/bookings-view.tsx
'use client'

import React, { useState } from 'react'
import {
  BookingStatus,
  PaymentStatus,
  BookingSource,
  PaymentMethod
} from '@prisma/client'
import { formatCurrency, rupeesToPaise } from '@/lib/currency'
import {
  formatHotelDate,
  formatHotelTime,
  getHotelCurrentTimeString,
  formatInputDate,
} from '@/lib/date-utils'
import {
  createBooking,
  createHistoricalBooking,
  checkInBooking,
  checkOutBooking,
  addPaymentToBooking,
  cancelBooking,
  deleteBooking,
} from '@/server/actions/booking-actions'
import {
  CalendarCheck,
  Plus,
  BookOpen,
  Search,
  Filter,
  UserCheck,
  UserX,
  CreditCard,
  FileText,
  XCircle,
  AlertTriangle,
  Clock,
  CheckCircle,
  Phone,
  BedDouble,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Percent,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const STATUS_BADGES: Record<BookingStatus, { label: string; bg: string; text: string }> = {
  RESERVED: { label: 'RESERVED', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  CHECKED_IN: { label: 'CHECKED IN', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  CHECKED_OUT: { label: 'CHECKED OUT', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  CANCELLED: { label: 'CANCELLED', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  NO_SHOW: { label: 'NO SHOW', bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
}

const PAYMENT_BADGES: Record<PaymentStatus, { label: string; bg: string; text: string }> = {
  UNPAID: { label: 'UNPAID', bg: 'bg-rose-500/10', text: 'text-rose-400' },
  PARTIALLY_PAID: { label: 'PARTIAL', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  PAID: { label: 'PAID', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  REFUNDED: { label: 'REFUNDED', bg: 'bg-purple-500/10', text: 'text-purple-400' },
}

export function BookingsView({
  initialBookings,
  availableRooms,
  initialGuests,
  userRole,
}: {
  initialBookings: any
  availableRooms: any[]
  initialGuests: any[]
  userRole?: string
}) {
  const router = useRouter()
  const [bookings, setBookings] = useState(initialBookings.bookings)
  const [totalCount, setTotalCount] = useState(initialBookings.totalCount)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL')

  const handleDeleteBooking = async (booking: any) => {
    const confirmMsg = `Are you sure you want to permanently delete Reservation ${booking.bookingNumber} for ${booking.guest.fullName}?\n\nThis will automatically remove all associated payment records and reset the room status to Available.`
    if (!window.confirm(confirmMsg)) return

    try {
      await deleteBooking(booking.id)
      setBookings((prev: any[]) => prev.filter((b) => b.id !== booking.id))
      setTotalCount((prev: number) => Math.max(0, prev - 1))
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'Failed to delete reservation')
    }
  }

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [checkInModalBooking, setCheckInModalBooking] = useState<any | null>(null)
  const [paymentModalBooking, setPaymentModalBooking] = useState<any | null>(null)
  const [checkOutModalBooking, setCheckOutModalBooking] = useState<any | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Create Booking Form State
  const [selectedGuestMode, setSelectedGuestMode] = useState<'existing' | 'new'>('new')
  const [selectedGuestId, setSelectedGuestId] = useState('')
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestCity, setGuestCity] = useState('')
  const [guestIdType, setGuestIdType] = useState('Aadhaar')
  const [guestIdNumber, setGuestIdNumber] = useState('')

  const [selectedRoomId, setSelectedRoomId] = useState(availableRooms[0]?.id || '')
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0])
  const [checkInTime, setCheckInTime] = useState(getHotelCurrentTimeString())
  const [hasCheckoutDate, setHasCheckoutDate] = useState(true)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const [checkoutDate, setCheckoutDate] = useState(tomorrow.toISOString().split('T')[0])
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState(0)

  // Daily extra charges and daily discount
  const [extraCharges, setExtraCharges] = useState(0) // ₹/day
  const [discount, setDiscount] = useState(0)         // ₹/day
  // GST Charged (default is 0)
  const [gstPercentage, setGstPercentage] = useState(0) // %
  const [bookingSource, setBookingSource] = useState<BookingSource>('WALK_IN')
  const [notes, setNotes] = useState('')

  // Advance payment
  const [collectAdvance, setCollectAdvance] = useState(false)
  const [advanceAmount, setAdvanceAmount] = useState(0)
  const [advanceMethod, setAdvanceMethod] = useState<PaymentMethod>('UPI')
  const [advanceRef, setAdvanceRef] = useState('')

  // Check-In Modal State
  const [modalCheckInTime, setModalCheckInTime] = useState(getHotelCurrentTimeString())
  const [modalCheckInNotes, setModalCheckInNotes] = useState('')

  // Payment Modal State
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')

  // Check-out Modal State
  const [modalCheckOutTime, setModalCheckOutTime] = useState(getHotelCurrentTimeString())
  const [settleBalanceAtCheckout, setSettleBalanceAtCheckout] = useState(true)
  const [checkoutMethod, setCheckoutMethod] = useState<PaymentMethod>('CASH')
  const [checkoutRef, setCheckoutRef] = useState('')

  // Historical Register Modal State
  const [showHistoricalModal, setShowHistoricalModal] = useState(false)
  const [histGuestMode, setHistGuestMode] = useState<'new' | 'existing'>('new')
  const [histGuestId, setHistGuestId] = useState('')
  const [histGuestName, setHistGuestName] = useState('')
  const [histGuestPhone, setHistGuestPhone] = useState('')
  const [histGuestEmail, setHistGuestEmail] = useState('')
  const [histGuestCity, setHistGuestCity] = useState('')
  const [histGuestIdType, setHistGuestIdType] = useState('Aadhaar')
  const [histGuestIdNumber, setHistGuestIdNumber] = useState('')

  const [histRoomId, setHistRoomId] = useState(availableRooms[0]?.id || '')
  const [histCheckInDate, setHistCheckInDate] = useState('')
  const [histCheckInTime, setHistCheckInTime] = useState('12:00')
  const [histCheckOutDate, setHistCheckOutDate] = useState('')
  const [histCheckOutTime, setHistCheckOutTime] = useState('11:00')
  const [histRoomTariff, setHistRoomTariff] = useState<number>(
    availableRooms[0] ? availableRooms[0].type.baseTariff / 100 : 1000
  )
  const [histExtraCharges, setHistExtraCharges] = useState(0)
  const [histDiscount, setHistDiscount] = useState(0)
  const [histGstPercentage, setHistGstPercentage] = useState(0)
  const [histPaymentMethod, setHistPaymentMethod] = useState<PaymentMethod>('CASH')
  const [histPaymentRef, setHistPaymentRef] = useState('Register Cash')
  const [histAmountPaid, setHistAmountPaid] = useState<number | ''>('')
  const [histSource, setHistSource] = useState<BookingSource>('WALK_IN')
  const [histNotes, setHistNotes] = useState('')

  // Calculate live preview totals for historical modal
  let histNights = 1
  if (histCheckInDate && histCheckOutDate) {
    const cIn = new Date(`${histCheckInDate}T${histCheckInTime || '12:00'}`)
    const cOut = new Date(`${histCheckOutDate}T${histCheckOutTime || '11:00'}`)
    if (cOut > cIn) {
      histNights = Math.max(1, Math.ceil((cOut.getTime() - cIn.getTime()) / (1000 * 60 * 60 * 24)))
    }
  }

  const histRoomCharges = (histRoomTariff || 0) * histNights
  const histTotalExtra = histExtraCharges * histNights
  const histTotalDiscount = histDiscount * histNights
  const histSubtotal = Math.max(0, histRoomCharges + histTotalExtra - histTotalDiscount)
  const histTax = Math.round((histSubtotal * histGstPercentage) / 100)
  const histGrandTotal = histSubtotal + histTax

  // Selected Room Tariff calculation helper
  const selectedRoom = availableRooms.find((r) => r.id === selectedRoomId)
  const currentTariffRupees = selectedRoom ? selectedRoom.type.baseTariff / 100 : 1000

  // Calculate live preview totals for create booking form
  let previewNights = 1
  if (hasCheckoutDate && checkoutDate) {
    const cIn = new Date(checkInDate)
    const cOut = new Date(checkoutDate)
    if (cOut > cIn) {
      previewNights = Math.max(1, Math.ceil((cOut.getTime() - cIn.getTime()) / (1000 * 60 * 60 * 24)))
    }
  }

  const previewRoomCharges = currentTariffRupees * previewNights
  const previewTotalExtra = extraCharges * previewNights
  const previewTotalDiscount = discount * previewNights
  const previewSubtotal = Math.max(0, previewRoomCharges + previewTotalExtra - previewTotalDiscount)
  const previewTax = Math.round((previewSubtotal * gstPercentage) / 100)
  const previewGrandTotal = previewSubtotal + previewTax

  // Filter Bookings
  const filteredBookings = bookings.filter((b: any) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
    if (paymentFilter !== 'ALL' && b.paymentStatus !== paymentFilter) return false

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const matchNum = b.bookingNumber?.toLowerCase().includes(q)
      const matchGuest = b.guest?.fullName?.toLowerCase().includes(q)
      const matchPhone = b.guest?.phone?.includes(q)
      const matchRoom = b.room?.number?.includes(q)
      if (!matchNum && !matchGuest && !matchPhone && !matchRoom) return false
    }
    return true
  })

  // Handle Form Submission for Creating Booking
  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const payload: any = {
        roomId: selectedRoomId,
        checkInDate,
        checkInTime: checkInTime || undefined,
        checkoutDate: hasCheckoutDate ? checkoutDate : undefined,
        adults: Number(adults),
        children: Number(children),
        roomTariff: Number(currentTariffRupees),
        extraCharges: Number(extraCharges), // daily
        discount: Number(discount),         // daily
        gstPercentage: Number(gstPercentage), // default 0%
        source: bookingSource,
        notes,
      }

      if (selectedGuestMode === 'existing') {
        payload.guestId = selectedGuestId
      } else {
        payload.newGuest = {
          fullName: guestName,
          phone: guestPhone,
          email: guestEmail,
          city: guestCity,
          idType: guestIdType,
          idNumber: guestIdNumber,
        }
      }

      if (collectAdvance && advanceAmount > 0) {
        payload.advancePayment = {
          amount: Number(advanceAmount),
          method: advanceMethod,
          reference: advanceRef,
        }
      }

      await createBooking(payload)
      setShowCreateModal(false)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Form Submission for Historical Booking
  const handleCreateHistoricalBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const payload: any = {
        roomId: histRoomId,
        checkInDate: histCheckInDate,
        checkInTime: histCheckInTime || '12:00',
        checkoutDate: histCheckOutDate,
        checkOutTime: histCheckOutTime || '11:00',
        adults: 1,
        children: 0,
        roomTariff: Number(histRoomTariff),
        extraCharges: Number(histExtraCharges),
        discount: Number(histDiscount),
        gstPercentage: Number(histGstPercentage),
        source: histSource,
        notes: histNotes,
        paymentMethod: histPaymentMethod,
        paymentReference: histPaymentRef,
        amountPaid: histAmountPaid === '' ? histGrandTotal : Number(histAmountPaid),
      }

      if (histGuestMode === 'existing') {
        payload.guestId = histGuestId
      } else {
        payload.newGuest = {
          fullName: histGuestName,
          phone: histGuestPhone,
          email: histGuestEmail,
          city: histGuestCity,
          idType: histGuestIdType,
          idNumber: histGuestIdNumber,
        }
      }

      await createHistoricalBooking(payload)
      setShowHistoricalModal(false)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record historical booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Check-In with Time Recording
  const handleExecuteCheckIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkInModalBooking) return
    setIsSubmitting(true)
    try {
      await checkInBooking({
        bookingId: checkInModalBooking.id,
        checkInTime: modalCheckInTime || undefined,
        notes: modalCheckInNotes || undefined,
      })
      setCheckInModalBooking(null)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Check-in failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Add Payment
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModalBooking) return
    setIsSubmitting(true)
    try {
      await addPaymentToBooking({
        bookingId: paymentModalBooking.id,
        amount: Number(paymentAmount),
        method: paymentMethod,
        reference: paymentRef,
        notes: paymentNotes,
      })
      setPaymentModalBooking(null)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Checkout with Time Recording and Dynamic Duration
  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!checkOutModalBooking) return
    setIsSubmitting(true)
    try {
      await checkOutBooking({
        bookingId: checkOutModalBooking.id,
        checkOutTime: modalCheckOutTime || undefined,
        settleBalance: settleBalanceAtCheckout,
        paymentMethod: settleBalanceAtCheckout ? checkoutMethod : undefined,
        paymentReference: settleBalanceAtCheckout ? checkoutRef : undefined,
      })
      setCheckOutModalBooking(null)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to check-out')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-amber-500" />
            <span>Booking Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Reservations, arrivals, flexible open-ended stays, daily charges, and double-booking conflict protection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setErrorMessage(null)
              setShowHistoricalModal(true)
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Log Past Stay (Register)</span>
          </button>

          <button
            onClick={() => {
              setErrorMessage(null)
              setShowCreateModal(true)
            }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Reservation</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Guest, Phone, Ref, Room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Reservation Statuses</option>
            <option value="RESERVED">Reserved</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        <div className="text-right flex items-center justify-end text-xs text-slate-400">
          Showing {filteredBookings.length} bookings
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Reference</th>
                <th className="p-4">Guest</th>
                <th className="p-4">Room</th>
                <th className="p-4">Dates & Time</th>
                <th className="p-4">Amount & Paid</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No bookings found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b: any) => {
                  const statusCfg = STATUS_BADGES[b.status as BookingStatus] || STATUS_BADGES.RESERVED
                  const payCfg = PAYMENT_BADGES[b.paymentStatus as PaymentStatus] || PAYMENT_BADGES.UNPAID
                  const totalPaid = b.payments.reduce((acc: number, p: any) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
                  const balance = Math.max(0, b.totalAmount - totalPaid)

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-amber-400 block">
                          {b.bookingNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase">
                          {b.source.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="font-semibold text-slate-200">{b.guest.fullName}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-500" />
                          <span>{b.guest.phone}</span>
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">Room {b.room.number}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                            F{b.room.floor}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500">{b.room.type.name}</p>
                      </td>

                      <td className="p-4 space-y-0.5">
                        <p className="text-slate-200">
                          {formatHotelDate(b.checkInDate)} {b.actualCheckIn ? `(${formatHotelTime(b.actualCheckIn)})` : ''} → {b.checkoutDate ? formatHotelDate(b.checkoutDate) : 'Open / Flexible'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {b.checkoutDate ? `${b.nights} night(s)` : 'Flexible Stay'} • {b.adults}A, {b.children}C
                        </p>
                      </td>

                      <td className="p-4">
                        <div className="font-mono font-semibold text-slate-200">
                          {formatCurrency(b.totalAmount)}
                        </div>
                        <div className="text-[10px] flex items-center gap-1.5 mt-0.5">
                          <span className="text-emerald-400 font-mono">
                            Paid: {formatCurrency(totalPaid)}
                          </span>
                          {balance > 0 && (
                            <span className="text-rose-400 font-mono font-bold">
                              (Due: {formatCurrency(balance)})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4 space-y-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-current/20 ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>
                        <div>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wider uppercase border border-current/20 ${payCfg.bg} ${payCfg.text}`}
                          >
                            {payCfg.label}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {b.status === 'RESERVED' && (
                            <button
                              onClick={() => {
                                setCheckInModalBooking(b)
                                setModalCheckInTime(getHotelCurrentTimeString())
                              }}
                              title="Check-in Guest with Time Recording"
                              className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}

                          {b.status === 'CHECKED_IN' && (
                            <button
                              onClick={() => {
                                setCheckOutModalBooking(b)
                                setModalCheckOutTime(getHotelCurrentTimeString())
                              }}
                              title="Check-out Guest with Time Recording"
                              className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          )}

                          {balance > 0 && b.status !== 'CANCELLED' && (
                            <button
                              onClick={() => {
                                setPaymentModalBooking(b)
                                setPaymentAmount(balance / 100)
                              }}
                              title="Record Payment"
                              className="p-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white rounded-lg transition-all"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          <Link
                            href={`/bookings/${b.id}/invoice`}
                            title="Print Invoice"
                            className="p-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-all"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>

                          {userRole === 'ADMIN' && (
                            <button
                              onClick={() => handleDeleteBooking(b)}
                              title="Delete Reservation (Admin)"
                              className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BOOKING MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-amber-500" />
                  <span>New Guest Reservation</span>
                </h3>
                <p className="text-xs text-slate-400">
                  DURGA LODGE reservation desk with time recording, flexible stays, and editable GST
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-4 text-xs">
              {/* Guest Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 uppercase tracking-wider">
                    Guest Information
                  </span>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedGuestMode('new')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        selectedGuestMode === 'new'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      New Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedGuestMode('existing')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        selectedGuestMode === 'existing'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Existing Guest
                    </button>
                  </div>
                </div>

                {selectedGuestMode === 'existing' ? (
                  <div>
                    <label className="text-slate-400 block mb-1">Select Guest</label>
                    <select
                      value={selectedGuestId}
                      onChange={(e) => setSelectedGuestId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="">-- Choose Guest --</option>
                      {initialGuests.map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.fullName} ({g.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Phone Number (10 digits) *</label>
                      <input
                        type="tel"
                        required
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">City</label>
                      <input
                        type="text"
                        value={guestCity}
                        onChange={(e) => setGuestCity(e.target.value)}
                        placeholder="e.g. Bhubaneswar"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-400 block mb-1">ID Type</label>
                        <select
                          value={guestIdType}
                          onChange={(e) => setGuestIdType(e.target.value)}
                          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                        >
                          <option value="Aadhaar">Aadhaar</option>
                          <option value="PAN">PAN</option>
                          <option value="Driving License">Driving License</option>
                          <option value="Passport">Passport</option>
                          <option value="Voter ID">Voter ID</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">ID Number</label>
                        <input
                          type="text"
                          value={guestIdNumber}
                          onChange={(e) => setGuestIdNumber(e.target.value)}
                          placeholder="ID details"
                          className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Room & Stay Details */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider block">
                  Room & Stay Timing
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Assign Room *</label>
                    <select
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      {availableRooms.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} ({r.type.name} - ₹{r.type.baseTariff / 100})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Check-In Date *</label>
                    <input
                      type="date"
                      required
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Check-In Time</label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Flexible Checkout Options */}
                <div className="pt-2 border-t border-slate-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="flexCheckout"
                      checked={!hasCheckoutDate}
                      onChange={(e) => setHasCheckoutDate(!e.target.checked)}
                      className="rounded bg-slate-900 border-slate-800 text-amber-500"
                    />
                    <label htmlFor="flexCheckout" className="text-slate-300 font-semibold cursor-pointer">
                      Open-Ended / Flexible Stay (No fixed checkout date; guest can check out anytime)
                    </label>
                  </div>

                  {hasCheckoutDate ? (
                    <div>
                      <label className="text-slate-400 block mb-1">Scheduled Check-Out Date *</label>
                      <input
                        type="date"
                        required={hasCheckoutDate}
                        value={checkoutDate}
                        onChange={(e) => setCheckoutDate(e.target.value)}
                        className="w-full sm:w-1/2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-400/90 italic">
                      Stay is open-ended. Room remains occupied until checkout is initiated. Charges scale daily.
                    </p>
                  )}
                </div>

                {/* Capacity */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-slate-400 block mb-1">Adults</label>
                    <input
                      type="number"
                      min="1"
                      value={adults}
                      onChange={(e) => setAdults(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Children</label>
                    <input
                      type="number"
                      min="0"
                      value={children}
                      onChange={(e) => setChildren(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing, Daily Extra/Discount, and GST */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider block">
                  Pricing, Daily Charges & GST
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Daily Extra Charges (₹/day)</label>
                    <input
                      type="number"
                      min="0"
                      value={extraCharges}
                      onChange={(e) => setExtraCharges(Number(e.target.value))}
                      placeholder="e.g. 200 for extra bed"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Applied daily per night</span>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Daily Discount (₹/day)</label>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      placeholder="e.g. 100"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Deducted daily per night</span>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">GST Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="28"
                        step="0.1"
                        value={gstPercentage}
                        onChange={(e) => setGstPercentage(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                      />
                      <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Default is 0%</span>
                  </div>
                </div>

                {/* Real-time Calculation Breakdown Preview */}
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Tariff ({previewNights} night{previewNights > 1 ? 's' : ''}):</span>
                    <span className="font-mono text-slate-200">{formatCurrency(previewRoomCharges * 100)}</span>
                  </div>
                  {previewTotalExtra > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Daily Extra (₹{extraCharges}/day × {previewNights}n):</span>
                      <span className="font-mono text-slate-200">+{formatCurrency(previewTotalExtra * 100)}</span>
                    </div>
                  )}
                  {previewTotalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Daily Discount (₹{discount}/day × {previewNights}n):</span>
                      <span className="font-mono">-{formatCurrency(previewTotalDiscount * 100)}</span>
                    </div>
                  )}
                  {previewTax > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>GST ({gstPercentage}%):</span>
                      <span className="font-mono text-slate-200">{formatCurrency(previewTax * 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1.5 border-t border-slate-800 text-sm text-amber-400">
                    <span>Estimated Total:</span>
                    <span className="font-mono">{formatCurrency(previewGrandTotal * 100)}</span>
                  </div>
                </div>
              </div>

              {/* Source & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Booking Source</label>
                  <select
                    value={bookingSource}
                    onChange={(e) => setBookingSource(e.target.value as BookingSource)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  >
                    <option value="WALK_IN">Walk-in</option>
                    <option value="PHONE">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="WEBSITE">Website</option>
                    <option value="OTA">OTA (MakeMyTrip / Goibibo)</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Special Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Late check-in, ground floor"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
              </div>

              {/* Advance Payment Section */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="advanceCheck"
                    checked={collectAdvance}
                    onChange={(e) => setCollectAdvance(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500"
                  />
                  <label htmlFor="advanceCheck" className="font-bold text-slate-300 cursor-pointer">
                    Collect Advance Deposit Now
                  </label>
                </div>

                {collectAdvance && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div>
                      <label className="text-slate-400 block mb-1">Advance Amount (₹) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={advanceAmount}
                        onChange={(e) => setAdvanceAmount(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Method *</label>
                      <select
                        value={advanceMethod}
                        onChange={(e) => setAdvanceMethod(e.target.value as PaymentMethod)}
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      >
                        <option value="UPI">UPI</option>
                        <option value="CASH">Cash</option>
                        <option value="CARD">Card</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Ref / Auth Code</label>
                      <input
                        type="text"
                        value={advanceRef}
                        onChange={(e) => setAdvanceRef(e.target.value)}
                        placeholder="UPI-1234..."
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Booking...' : 'Confirm Reservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECK-IN WITH TIME RECORDING MODAL */}
      {checkInModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-500" />
                <span>Guest Check-In Time Recording</span>
              </h3>
              <button onClick={() => setCheckInModalBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-slate-200">
                Guest: {checkInModalBooking.guest.fullName} ({checkInModalBooking.guest.phone})
              </p>
              <p className="text-slate-400">
                Room {checkInModalBooking.room.number} • Booking Ref: #{checkInModalBooking.bookingNumber}
              </p>
            </div>

            <form onSubmit={handleExecuteCheckIn} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Check-In Time *</span>
                </label>
                <input
                  type="time"
                  required
                  value={modalCheckInTime}
                  onChange={(e) => setModalCheckInTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Check-In Notes / Luggage</label>
                <input
                  type="text"
                  value={modalCheckInNotes}
                  onChange={(e) => setModalCheckInNotes(e.target.value)}
                  placeholder="e.g. ID verified, 2 bags"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCheckInModalBooking(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting ? 'Checking In...' : `Confirm Check-In (${modalCheckInTime})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-500" />
                <span>Receive Payment</span>
              </h3>
              <button onClick={() => setPaymentModalBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="font-semibold text-slate-200">
                Booking: #{paymentModalBooking.bookingNumber} ({paymentModalBooking.guest.fullName})
              </p>
              <p className="text-slate-400">
                Room {paymentModalBooking.room.number} • Total: {formatCurrency(paymentModalBooking.totalAmount)}
              </p>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-xs"
                >
                  <option value="UPI">UPI (QR / PhonePe / GPay)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card (POS Terminal)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Reference / Transaction ID</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI-921820 or Card Auth Code"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalBooking(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl shadow-lg shadow-amber-600/20"
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECK-OUT WITH TIME RECORDING & DYNAMIC BILLING MODAL */}
      {checkOutModalBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <UserX className="w-5 h-5 text-rose-500" />
                <span>Guest Check-Out & Folio</span>
              </h3>
              <button onClick={() => setCheckOutModalBooking(null)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const effectiveCheckIn = new Date(checkOutModalBooking.actualCheckIn || checkOutModalBooking.createdAt || checkOutModalBooking.checkInDate)
              const today = new Date().toISOString().split('T')[0]
              const checkoutDateTime = new Date(`${today}T${modalCheckOutTime || '12:00'}:00`)
              const diffMs = Math.max(0, checkoutDateTime.getTime() - effectiveCheckIn.getTime())
              const dynamicNights = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))

              const roomCharges = checkOutModalBooking.roomTariff * dynamicNights
              const extraTotal = (checkOutModalBooking.extraCharges || 0) * dynamicNights
              const discountTotal = (checkOutModalBooking.discount || 0) * dynamicNights
              const taxableAmount = Math.max(0, roomCharges + extraTotal - discountTotal)
              const tax = checkOutModalBooking.taxRate ? Math.round((taxableAmount * checkOutModalBooking.taxRate) / 10000) : 0
              const dynamicTotal = taxableAmount + tax

              const paid = checkOutModalBooking.payments.reduce((acc: number, p: any) => p.isRefund ? acc - p.amount : acc + p.amount, 0)
              const balance = Math.max(0, dynamicTotal - paid)

              return (
                <form onSubmit={handleCheckOut} className="space-y-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between text-slate-400">
                      <span>Room:</span>
                      <span className="font-bold text-white">Room {checkOutModalBooking.room.number}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Guest:</span>
                      <span className="font-bold text-white">{checkOutModalBooking.guest.fullName}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Check-In Recorded:</span>
                      <span className="text-slate-300">
                        {formatHotelDate(effectiveCheckIn)} ({formatHotelTime(effectiveCheckIn)})
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Stay Duration:</span>
                      <span className="font-semibold text-amber-400">{dynamicNights} {dynamicNights === 1 ? 'night' : 'nights'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Total Charges:</span>
                      <span className="font-mono text-white">{formatCurrency(dynamicTotal)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Paid to Date:</span>
                      <span className="font-mono text-emerald-400">{formatCurrency(paid)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-slate-800 text-sm">
                      <span className={balance > 0 ? 'text-rose-400' : 'text-slate-200'}>Balance Due:</span>
                      <span className={`font-mono ${balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  </div>

                  {/* Time Recording Input */}
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Check-Out Time *</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={modalCheckOutTime}
                      onChange={(e) => setModalCheckOutTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-sm focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  {balance > 0 && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="settleCheck"
                          checked={settleBalanceAtCheckout}
                          onChange={(e) => setSettleBalanceAtCheckout(e.target.checked)}
                          className="rounded bg-slate-900 border-rose-500/50 text-amber-500"
                        />
                        <label htmlFor="settleCheck" className="font-bold text-rose-300 cursor-pointer">
                          Settle full balance ({formatCurrency(balance)}) now
                        </label>
                      </div>

                      {settleBalanceAtCheckout && (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="text-slate-400 block mb-1">Method</label>
                            <select
                              value={checkoutMethod}
                              onChange={(e) => setCheckoutMethod(e.target.value as PaymentMethod)}
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                            >
                              <option value="CASH">Cash</option>
                              <option value="UPI">UPI</option>
                              <option value="CARD">Card</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Ref / Notes</label>
                            <input
                              type="text"
                              value={checkoutRef}
                              onChange={(e) => setCheckoutRef(e.target.value)}
                              placeholder="Cash counter"
                              className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 italic">
                    Note: Checking out will set Room {checkOutModalBooking.room.number} status to CLEANING and record checkout timestamp.
                  </p>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setCheckOutModalBooking(null)}
                      className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-lg shadow-rose-600/20"
                    >
                      {isSubmitting ? 'Processing...' : `Complete Check-Out (${modalCheckOutTime})`}
                    </button>
                  </div>
                </form>
              )
            })()}
          </div>
        </div>
      )}

      {/* HISTORICAL STAY MODAL (SCENARIO 3: FROM PAPER REGISTER) */}
      {showHistoricalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-amber-500" />
                  <span>Log Past / Historical Stay (Paper Register)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Record past completed guest stays from your physical register. Saves as CHECKED_OUT and updates history without altering live room status.
                </p>
              </div>
              <button
                onClick={() => setShowHistoricalModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Archival Entry Guarantee</p>
                <p className="text-[11px] text-amber-400/90 mt-0.5">
                  This stay will be archived with status <strong>CHECKED OUT</strong> on the historical date specified. It will immediately show up in revenue reports, guest repeat history, and ledgers, and will <strong>not</strong> mark the room as occupied today.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateHistoricalBooking} className="space-y-4 text-xs">
              {/* Guest Information */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300 uppercase tracking-wider">
                    Guest Information
                  </span>
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setHistGuestMode('new')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        histGuestMode === 'new'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      New Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistGuestMode('existing')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        histGuestMode === 'existing'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Existing Guest
                    </button>
                  </div>
                </div>

                {histGuestMode === 'existing' ? (
                  <div>
                    <label className="text-slate-400 block mb-1">Select Guest</label>
                    <select
                      value={histGuestId}
                      onChange={(e) => setHistGuestId(e.target.value)}
                      required
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="">-- Choose Guest --</option>
                      {initialGuests.map((g: any) => (
                        <option key={g.id} value={g.id}>
                          {g.fullName} ({g.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={histGuestName}
                        onChange={(e) => setHistGuestName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        value={histGuestPhone}
                        onChange={(e) => setHistGuestPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">City / Hometown</label>
                      <input
                        type="text"
                        value={histGuestCity}
                        onChange={(e) => setHistGuestCity(e.target.value)}
                        placeholder="e.g. Bhubaneswar, Kolkata"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">ID Proof Number</label>
                      <input
                        type="text"
                        value={histGuestIdNumber}
                        onChange={(e) => setHistGuestIdNumber(e.target.value)}
                        placeholder="e.g. Aadhaar / Voter ID"
                        className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Room & Dates */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider block">
                  Room & Historical Stay Dates
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Room Occupied *</label>
                    <select
                      value={histRoomId}
                      onChange={(e) => {
                        setHistRoomId(e.target.value)
                        const rm = availableRooms.find((r) => r.id === e.target.value)
                        if (rm) setHistRoomTariff(rm.type.baseTariff / 100)
                      }}
                      required
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      {availableRooms.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          Room {r.number} - {r.type.name} (Base ₹{r.type.baseTariff / 100})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Historical Room Tariff (₹ / Night) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={histRoomTariff}
                      onChange={(e) => setHistRoomTariff(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 block mb-1">Historical Check-In Date *</label>
                    <input
                      type="date"
                      required
                      value={histCheckInDate}
                      onChange={(e) => setHistCheckInDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Check-In Time</label>
                    <input
                      type="time"
                      value={histCheckInTime}
                      onChange={(e) => setHistCheckInTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Historical Check-Out Date *</label>
                    <input
                      type="date"
                      required
                      value={histCheckOutDate}
                      onChange={(e) => setHistCheckOutDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Check-Out Time</label>
                    <input
                      type="time"
                      value={histCheckOutTime}
                      onChange={(e) => setHistCheckOutTime(e.target.value)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-slate-900 rounded-lg text-slate-300 flex items-center justify-between text-xs">
                  <span>Calculated Duration:</span>
                  <span className="font-bold text-amber-400 font-mono">{histNights} {histNights === 1 ? 'Night' : 'Nights'}</span>
                </div>
              </div>

              {/* Adjustments & GST */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Extra Charges (Daily / Night)</label>
                  <input
                    type="number"
                    min="0"
                    value={histExtraCharges}
                    onChange={(e) => setHistExtraCharges(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Discount (Daily / Night)</label>
                  <input
                    type="number"
                    min="0"
                    value={histDiscount}
                    onChange={(e) => setHistDiscount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">GST Charged (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={histGstPercentage}
                    onChange={(e) => setHistGstPercentage(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Financial Calculation Preview */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="font-bold text-slate-300 uppercase tracking-wider block mb-1">
                  Historical Financial Breakdown
                </span>
                <div className="flex justify-between text-slate-400">
                  <span>Room Charges ({histNights} nights × ₹{histRoomTariff}):</span>
                  <span className="font-mono text-slate-200">{formatCurrency(histRoomCharges * 100)}</span>
                </div>
                {histTotalExtra > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Extra Charges ({histNights} nights × ₹{histExtraCharges}):</span>
                    <span className="font-mono text-slate-200">{formatCurrency(histTotalExtra * 100)}</span>
                  </div>
                )}
                {histTotalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({histNights} nights × ₹{histDiscount}):</span>
                    <span className="font-mono">-{formatCurrency(histTotalDiscount * 100)}</span>
                  </div>
                )}
                {histTax > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({histGstPercentage}%):</span>
                    <span className="font-mono text-slate-200">{formatCurrency(histTax * 100)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t border-slate-800 text-sm text-slate-100">
                  <span>Total Folio Amount:</span>
                  <span className="font-mono text-amber-400">{formatCurrency(histGrandTotal * 100)}</span>
                </div>
              </div>

              {/* Payment Settlement */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider block">
                  Settlement & Register Notes
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Amount Paid (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={histAmountPaid === '' ? histGrandTotal : histAmountPaid}
                      onChange={(e) => setHistAmountPaid(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Payment Method</label>
                    <select
                      value={histPaymentMethod}
                      onChange={(e) => setHistPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="CASH">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Register Page / Slip Ref</label>
                    <input
                      type="text"
                      value={histPaymentRef}
                      onChange={(e) => setHistPaymentRef(e.target.value)}
                      placeholder="e.g. Register Vol 1 Page 32"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-slate-400 block mb-1">Booking Source</label>
                    <select
                      value={histSource}
                      onChange={(e) => setHistSource(e.target.value as BookingSource)}
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    >
                      <option value="WALK_IN">Walk-in</option>
                      <option value="PHONE">Phone Call</option>
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="OTA">OTA</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Archival Notes</label>
                    <input
                      type="text"
                      value={histNotes}
                      onChange={(e) => setHistNotes(e.target.value)}
                      placeholder="e.g. Imported from handwritten register"
                      className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowHistoricalModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{isSubmitting ? 'Archiving Stay...' : 'Save Historical Stay to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

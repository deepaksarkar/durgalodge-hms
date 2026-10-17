// src/server/actions/guest-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { requireAuth } from '@/lib/auth'

const guestSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  notes: z.string().optional(),
})

export async function getGuests(params: {
  search?: string
  limit?: number
  page?: number
} = {}) {
  await requireAuth()
  const limit = params.limit || 20
  const page = params.page || 1
  const skip = (page - 1) * limit

  const where: any = {}

  if (params.search && params.search.trim() !== '') {
    const s = params.search.trim()
    where.OR = [
      { fullName: { contains: s, mode: 'insensitive' } },
      { phone: { contains: s } },
      { email: { contains: s, mode: 'insensitive' } },
      { idNumber: { contains: s, mode: 'insensitive' } },
    ]
  }

  const [totalCount, guests] = await Promise.all([
    prisma.guest.count({ where }),
    prisma.guest.findMany({
      where,
      include: {
        bookings: {
          select: {
            id: true,
            totalAmount: true,
            nights: true,
            status: true,
            checkInDate: true,
            payments: { select: { amount: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
  ])

  // Enhance with computed metrics
  const enhancedGuests = guests.map((g) => {
    const completedOrActive = g.bookings.filter((b) => b.status !== 'CANCELLED')
    const totalStays = completedOrActive.length
    const totalSpent = completedOrActive.reduce((acc, b) => {
      const paid = b.payments.reduce((pAcc, p) => pAcc + p.amount, 0)
      return acc + paid
    }, 0)
    const totalNights = completedOrActive.reduce((acc, b) => acc + b.nights, 0)
    const avgStay = totalStays > 0 ? (totalNights / totalStays).toFixed(1) : '0'

    return {
      ...g,
      totalStays,
      totalSpent,
      avgStay,
      lastStay: completedOrActive[0]?.checkInDate || null,
    }
  })

  return {
    guests: enhancedGuests,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    page,
    limit,
  }
}

export async function getGuestProfile(guestId: string) {
  await requireAuth()
  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      bookings: {
        include: {
          room: { include: { type: true } },
          payments: true,
        },
        orderBy: { checkInDate: 'desc' },
      },
    },
  })

  if (!guest) return null

  const validBookings = guest.bookings.filter((b) => b.status !== 'CANCELLED')
  const totalStays = validBookings.length
  const totalSpent = validBookings.reduce((sum, b) => {
    return sum + b.payments.reduce((pSum, p) => pSum + p.amount, 0)
  }, 0)
  const totalNights = validBookings.reduce((sum, b) => sum + b.nights, 0)
  const averageStay = totalStays > 0 ? Number((totalNights / totalStays).toFixed(1)) : 0
  const lastStay = validBookings[0]?.checkInDate || null

  return {
    ...guest,
    totalStays,
    totalSpent,
    averageStay,
    lastStay,
  }
}

export async function createGuest(data: z.infer<typeof guestSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = guestSchema.parse(data)

  const existing = await prisma.guest.findUnique({ where: { phone: parsed.phone } })
  if (existing) {
    throw new Error(`Guest with phone number ${parsed.phone} already exists`)
  }

  const guest = await prisma.guest.create({
    data: {
      fullName: parsed.fullName,
      phone: parsed.phone,
      email: parsed.email || null,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      country: parsed.country || 'India',
      idType: parsed.idType,
      idNumber: parsed.idNumber,
      notes: parsed.notes,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'GUEST_CREATED',
      entity: 'Guest',
      entityId: guest.id,
      metadata: { name: guest.fullName, phone: guest.phone },
    },
  })

  revalidatePath('/guests')
  return { success: true, guest }
}

export async function updateGuest(guestId: string, data: z.infer<typeof guestSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = guestSchema.parse(data)

  const guest = await prisma.guest.update({
    where: { id: guestId },
    data: {
      fullName: parsed.fullName,
      phone: parsed.phone,
      email: parsed.email || null,
      address: parsed.address,
      city: parsed.city,
      state: parsed.state,
      country: parsed.country,
      idType: parsed.idType,
      idNumber: parsed.idNumber,
      notes: parsed.notes,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'GUEST_UPDATED',
      entity: 'Guest',
      entityId: guest.id,
      metadata: { name: guest.fullName },
    },
  })

  revalidatePath('/guests')
  return { success: true, guest }
}

/**
 * Delete a guest (Admin only)
 * Automatically removes all reservations and payment records of this guest,
 * frees any rooms that are occupied/reserved, and creates an audit log.
 */
export async function deleteGuest(guestId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Permission denied: Only Admin can delete guests')
  }

  const guest = await prisma.guest.findUnique({
    where: { id: guestId },
    include: {
      bookings: {
        include: { payments: true, room: true },
      },
    },
  })

  if (!guest) throw new Error('Guest not found')

  const bookingIds = guest.bookings.map((b) => b.id)
  const roomIdsToFree = guest.bookings
    .filter((b) => b.status === 'RESERVED' || b.status === 'CHECKED_IN')
    .map((b) => b.roomId)

  let totalPaymentsDeleted = 0
  guest.bookings.forEach((b) => {
    totalPaymentsDeleted += b.payments.length
  })

  await prisma.$transaction(async (tx) => {
    // 1. Delete all payments of all bookings for this guest
    if (bookingIds.length > 0) {
      await tx.payment.deleteMany({
        where: { bookingId: { in: bookingIds } },
      })

      // 2. Free up any rooms currently occupied or reserved by this guest
      if (roomIdsToFree.length > 0) {
        await tx.room.updateMany({
          where: { id: { in: roomIdsToFree } },
          data: { status: 'AVAILABLE' },
        })
      }

      // 3. Delete all bookings
      await tx.booking.deleteMany({
        where: { id: { in: bookingIds } },
      })
    }

    // 4. Delete the guest
    await tx.guest.delete({
      where: { id: guestId },
    })

    // 5. Create audit log
    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'GUEST_DELETED',
        entity: 'Guest',
        entityId: guestId,
        metadata: {
          fullName: guest.fullName,
          phone: guest.phone,
          deletedBookingsCount: bookingIds.length,
          deletedPaymentsCount: totalPaymentsDeleted,
        },
      },
    })
  })

  revalidatePath('/guests')
  revalidatePath('/bookings')
  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  revalidatePath('/payments')
  revalidatePath('/revenue')
  return { success: true }
}

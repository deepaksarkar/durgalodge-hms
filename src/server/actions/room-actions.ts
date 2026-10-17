// src/server/actions/room-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { RoomStatus, Role } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { requireAuth } from '@/lib/auth'

const updateRoomStatusSchema = z.object({
  roomId: z.string().uuid(),
  status: z.nativeEnum(RoomStatus),
  notes: z.string().optional(),
})

const createRoomSchema = z.object({
  number: z.string().min(1, 'Room number is required'),
  floor: z.string().min(1, 'Floor is required'),
  typeId: z.string().uuid('Please select a room type'),
  notes: z.string().optional(),
})

const createRoomTypeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  baseTariff: z.number().positive('Tariff must be positive'), // Input in Rupees
  capacity: z.number().int().min(1).default(2),
  isAC: z.boolean().default(false),
  isAttachedBath: z.boolean().default(true),
  description: z.string().optional(),
})

const editRoomSchema = z.object({
  roomId: z.string().uuid(),
  number: z.string().min(1),
  floor: z.string().min(1),
  typeId: z.string().uuid(),
  notes: z.string().optional(),
})

export async function getRoomsWithStatus() {
  await requireAuth()
  const rooms = await prisma.room.findMany({
    where: { isActive: true },
    include: {
      type: true,
      bookings: {
        where: {
          status: { in: ['RESERVED', 'CHECKED_IN'] },
        },
        include: {
          guest: true,
          payments: true,
        },
        orderBy: { checkInDate: 'asc' },
        take: 2,
      },
    },
    orderBy: { number: 'asc' },
  })

  return rooms
}

export async function getRoomTypes() {
  await requireAuth()
  return await prisma.roomType.findMany({
    orderBy: { baseTariff: 'asc' },
    include: {
      _count: {
        select: { rooms: true },
      },
    },
  })
}

export async function getRoomDetails(roomId: string) {
  await requireAuth()
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      type: true,
      bookings: {
        include: {
          guest: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })
  return room
}

export async function updateRoomStatus(formData: z.infer<typeof updateRoomStatusSchema>) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const parsed = updateRoomStatusSchema.parse(formData)

  const updatedRoom = await prisma.$transaction(async (tx) => {
    const room = await tx.room.update({
      where: { id: parsed.roomId },
      data: {
        status: parsed.status,
        notes: parsed.notes !== undefined ? parsed.notes : undefined,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'ROOM_STATUS_CHANGE',
        entity: 'Room',
        entityId: parsed.roomId,
        metadata: { newStatus: parsed.status, notes: parsed.notes, roomNumber: room.number },
      },
    })

    return room
  })

  revalidatePath('/rooms')
  revalidatePath('/dashboard')
  return { success: true, room: updatedRoom }
}

export async function createRoom(formData: z.infer<typeof createRoomSchema>) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied')
  }

  const parsed = createRoomSchema.parse(formData)

  const existing = await prisma.room.findUnique({ where: { number: parsed.number } })
  if (existing) {
    throw new Error(`Room number ${parsed.number} already exists`)
  }

  const room = await prisma.room.create({
    data: {
      number: parsed.number,
      floor: parsed.floor,
      typeId: parsed.typeId,
      notes: parsed.notes,
      status: 'AVAILABLE',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'ROOM_CREATED',
      entity: 'Room',
      entityId: room.id,
      metadata: { number: room.number, floor: room.floor },
    },
  })

  revalidatePath('/rooms')
  revalidatePath('/settings')
  return { success: true, room }
}

export async function createRoomType(formData: z.infer<typeof createRoomTypeSchema>) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied')
  }

  const parsed = createRoomTypeSchema.parse(formData)
  const baseTariffPaise = Math.round(parsed.baseTariff * 100)

  const roomType = await prisma.roomType.create({
    data: {
      name: parsed.name,
      baseTariff: baseTariffPaise,
      capacity: parsed.capacity,
      isAC: parsed.isAC,
      isAttachedBath: parsed.isAttachedBath,
      description: parsed.description,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'ROOM_TYPE_CREATED',
      entity: 'RoomType',
      entityId: roomType.id,
      metadata: { name: roomType.name, tariff: baseTariffPaise },
    },
  })

  revalidatePath('/rooms')
  revalidatePath('/settings')
  return { success: true, roomType }
}

export async function updateRoomDetails(formData: z.infer<typeof editRoomSchema>) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied')
  }

  const parsed = editRoomSchema.parse(formData)

  const room = await prisma.room.update({
    where: { id: parsed.roomId },
    data: {
      number: parsed.number,
      floor: parsed.floor,
      typeId: parsed.typeId,
      notes: parsed.notes,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'ROOM_UPDATED',
      entity: 'Room',
      entityId: room.id,
      metadata: { number: room.number },
    },
  })

  revalidatePath('/rooms')
  revalidatePath('/settings')
  return { success: true, room }
}

/**
 * Update an existing room type
 */
export async function updateRoomType(roomTypeId: string, formData: z.infer<typeof createRoomTypeSchema>) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied: Only Admin/Manager can edit room types')
  }

  const parsed = createRoomTypeSchema.parse(formData)
  const baseTariffPaise = Math.round(parsed.baseTariff * 100)

  const roomType = await prisma.roomType.update({
    where: { id: roomTypeId },
    data: {
      name: parsed.name,
      baseTariff: baseTariffPaise,
      capacity: parsed.capacity,
      isAC: parsed.isAC,
      isAttachedBath: parsed.isAttachedBath,
      description: parsed.description,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'ROOM_TYPE_UPDATED',
      entity: 'RoomType',
      entityId: roomType.id,
      metadata: { name: roomType.name, tariff: baseTariffPaise },
    },
  })

  revalidatePath('/rooms')
  revalidatePath('/settings')
  return { success: true, roomType }
}

/**
 * Delete a room type (Admin only)
 * If cascade is true, deletes all assigned rooms along with their bookings and payments
 */
export async function deleteRoomType(roomTypeId: string, cascade = false) {
  const session = await getSession()
  if (!session || session.role !== Role.ADMIN) {
    throw new Error('Permission denied: Only Admin can delete room categories')
  }

  const roomType = await prisma.roomType.findUnique({
    where: { id: roomTypeId },
    include: {
      rooms: {
        include: { bookings: { select: { id: true } } },
      },
    },
  })
  if (!roomType) throw new Error('Room category not found')

  if (roomType.rooms.length > 0 && !cascade) {
    throw new Error(
      `Cannot delete category: ${roomType.rooms.length} room(s) are currently assigned to this category. Please reassign rooms or enable cascade deletion.`
    )
  }

  await prisma.$transaction(async (tx) => {
    if (roomType.rooms.length > 0) {
      const roomIds = roomType.rooms.map((r) => r.id)
      const bookingIds = roomType.rooms.flatMap((r) => r.bookings.map((b) => b.id))

      if (bookingIds.length > 0) {
        await tx.payment.deleteMany({
          where: { bookingId: { in: bookingIds } },
        })
        await tx.booking.deleteMany({
          where: { id: { in: bookingIds } },
        })
      }

      await tx.room.deleteMany({
        where: { id: { in: roomIds } },
      })
    }

    await tx.roomType.delete({
      where: { id: roomTypeId },
    })

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'ROOM_TYPE_DELETED',
        entity: 'RoomType',
        entityId: roomTypeId,
        metadata: {
          name: roomType.name,
          cascadedRoomsCount: roomType.rooms.length,
        },
      },
    })
  })

  revalidatePath('/rooms')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/bookings')
  return { success: true }
}

/**
 * Delete a room (Admin only) - removes room and cascades its bookings and payments
 */
export async function deleteRoom(roomId: string) {
  const session = await getSession()
  if (!session || session.role !== Role.ADMIN) {
    throw new Error('Permission denied: Only Admin can delete rooms')
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { bookings: { select: { id: true } } },
  })
  if (!room) throw new Error('Room not found')

  const bookingIds = room.bookings.map((b) => b.id)

  await prisma.$transaction(async (tx) => {
    // Delete payments for all bookings of this room
    if (bookingIds.length > 0) {
      await tx.payment.deleteMany({
        where: { bookingId: { in: bookingIds } },
      })
      await tx.booking.deleteMany({
        where: { id: { in: bookingIds } },
      })
    }

    await tx.room.delete({
      where: { id: roomId },
    })

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'ROOM_DELETED',
        entity: 'Room',
        entityId: roomId,
        metadata: { number: room.number, deletedBookingsCount: bookingIds.length },
      },
    })
  })

  revalidatePath('/rooms')
  revalidatePath('/settings')
  revalidatePath('/dashboard')
  revalidatePath('/bookings')
  return { success: true }
}
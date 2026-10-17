// src/server/actions/user-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import * as argon2 from 'argon2'

const createUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role),
})

export async function getUsers() {
  const session = await getSession()
  if (!session || session.role !== Role.ADMIN) {
    throw new Error('Permission denied: Only Admin can access user management')
  }

  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createUser(data: z.infer<typeof createUserSchema>) {
  const session = await getSession()
  if (!session || session.role !== Role.ADMIN) {
    throw new Error('Permission denied')
  }

  const parsed = createUserSchema.parse(data)
  const existing = await prisma.user.findUnique({ where: { email: parsed.email.toLowerCase().trim() } })
  if (existing) {
    throw new Error(`User with email ${parsed.email} already exists`)
  }

  const passwordHash = await argon2.hash(parsed.password)

  const user = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email.toLowerCase().trim(),
      passwordHash,
      role: parsed.role,
      isActive: true,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email, role: user.role },
    },
  })

  revalidatePath('/users')
  return { success: true, user }
}

export async function toggleUserStatus(userId: string) {
  const session = await getSession()
  if (!session || session.role !== Role.ADMIN) {
    throw new Error('Permission denied')
  }

  if (userId === session.userId) {
    throw new Error('Cannot deactivate your own account')
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw new Error('User not found')

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entity: 'User',
      entityId: user.id,
      metadata: { email: user.email, active: updated.isActive },
    },
  })

  revalidatePath('/users')
  return { success: true, user: updated }
}

// src/server/actions/auth-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { createSession, deleteSession, getSession } from '@/lib/session'
import * as argon2 from 'argon2'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export type LoginState = {
  error?: string
  success?: boolean
}

export async function loginAction(prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const validation = loginSchema.safeParse({ email, password })
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message || 'Invalid input data' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: validation.data.email.toLowerCase().trim() },
    })

    if (!user || !user.isActive) {
      return { error: 'Invalid email or password' }
    }

    const isValid = await argon2.verify(user.passwordHash, validation.data.password)
    if (!isValid) {
      return { error: 'Invalid email or password' }
    }

    // Create session in HTTP-only cookie
    await createSession(user.id, user.role)

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entity: 'User',
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
      },
    })
  } catch (err: any) {
    console.error('Login action error:', err)
    return { error: 'An unexpected error occurred during login. Please try again.' }
  }

  redirect('/dashboard')
}

export async function logoutAction() {
  try {
    const session = await getSession()
    if (session?.userId) {
      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'USER_LOGOUT',
          entity: 'User',
          entityId: session.userId,
        },
      })
    }
  } catch (e) {
    // Continue logout even if audit log fails
  }

  await deleteSession()
  redirect('/login')
}
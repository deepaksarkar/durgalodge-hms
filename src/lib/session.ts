// src/lib/session.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { Role } from '@prisma/client'

function getSecretKey(): Uint8Array {
  const secretKey = process.env.AUTH_SECRET
  if (process.env.NODE_ENV === 'production') {
    if (!secretKey || secretKey.length < 32) {
      throw new Error('FATAL SECURITY ERROR: AUTH_SECRET must be set and contain at least 32 characters in production.')
    }
  }
  return new TextEncoder().encode(secretKey || 'durga_lodge_dev_secret_key_minimum_32_characters_long!')
}

const key = getSecretKey()

export type SessionPayload = {
    userId: string
    role: Role
    expiresAt: Date
}

export async function encrypt(payload: SessionPayload) {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1d') // 1 day session
        .sign(key)
}

export async function decrypt(session: string | undefined = '') {
    try {
        const { payload } = await jwtVerify(session, key, {
            algorithms: ['HS256'],
        })
        return payload as SessionPayload
    } catch (error) {
        return null
    }
}

export async function getSession() {
    const cookieStore = await cookies()
    const session = cookieStore.get('session')?.value

    if (!session) {
        return null
    }

    return await decrypt(session)
}

export async function createSession(userId: string, role: Role) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ userId, role, expiresAt })

    const cookieStore = await cookies()

    cookieStore.set('session', session, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
        sameSite: 'lax',
        path: '/',
    })
}

export async function deleteSession() {
    const cookieStore = await cookies()
    cookieStore.delete('session')
}
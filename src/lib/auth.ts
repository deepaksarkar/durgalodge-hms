// src/lib/auth.ts
import { Role } from '@prisma/client'
import { getSession } from './session'
import { prisma } from './db'

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'MANAGE_ROOMS'
  | 'UPDATE_ROOM_STATUS'
  | 'MANAGE_BOOKINGS'
  | 'CHECK_IN_OUT'
  | 'MANAGE_GUESTS'
  | 'RECORD_PAYMENTS'
  | 'MANAGE_EXPENSES'
  | 'VIEW_FINANCIALS'
  | 'VIEW_REPORTS'
  | 'PERFORM_DAILY_CLOSING'
  | 'MANAGE_SETTINGS'
  | 'MANAGE_USERS'
  | 'VIEW_AUDIT_LOGS'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: [
    'VIEW_DASHBOARD',
    'MANAGE_ROOMS',
    'UPDATE_ROOM_STATUS',
    'MANAGE_BOOKINGS',
    'CHECK_IN_OUT',
    'MANAGE_GUESTS',
    'RECORD_PAYMENTS',
    'MANAGE_EXPENSES',
    'VIEW_FINANCIALS',
    'VIEW_REPORTS',
    'PERFORM_DAILY_CLOSING',
    'MANAGE_SETTINGS',
    'MANAGE_USERS',
    'VIEW_AUDIT_LOGS',
  ],
  MANAGER: [
    'VIEW_DASHBOARD',
    'MANAGE_ROOMS',
    'UPDATE_ROOM_STATUS',
    'MANAGE_BOOKINGS',
    'CHECK_IN_OUT',
    'MANAGE_GUESTS',
    'RECORD_PAYMENTS',
    'MANAGE_EXPENSES',
    'VIEW_FINANCIALS',
    'VIEW_REPORTS',
    'PERFORM_DAILY_CLOSING',
  ],
  RECEPTION: [
    'VIEW_DASHBOARD',
    'UPDATE_ROOM_STATUS',
    'MANAGE_BOOKINGS',
    'CHECK_IN_OUT',
    'MANAGE_GUESTS',
    'RECORD_PAYMENTS',
  ],
  STAFF: [
    'UPDATE_ROOM_STATUS',
  ],
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.userId) return null

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    if (!user || !user.isActive) return null
    return user
  } catch (error) {
    console.error('Error fetching current user:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED: Authentication required')
  }
  return user
}

export async function requirePermission(permission: Permission) {
  const user = await requireAuth()
  const allowed = ROLE_PERMISSIONS[user.role]?.includes(permission)
  if (!allowed) {
    throw new Error(`FORBIDDEN: You do not have permission for [${permission}]`)
  }
  return user
}

export async function requireRole(allowedRoles: Role[]) {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(', ')}] role`)
  }
  return user
}

// src/app/(dashboard)/users/page.tsx
import React from 'react'
import { getUsers } from '@/server/actions/user-actions'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { UsersClientView } from '@/components/admin/users-client-view'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  const users = await getUsers()

  return <UsersClientView initialUsers={users} currentUserId={currentUser.id} />
}

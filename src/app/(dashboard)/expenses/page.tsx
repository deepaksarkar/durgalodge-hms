// src/app/(dashboard)/expenses/page.tsx
import React from 'react'
import { getExpenses, getExpenseCategories } from '@/server/actions/expense-actions'
import { ExpensesView } from '@/components/expenses/expenses-view'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const currentUser = await getCurrentUser()
  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  const [initialExpenses, categories] = await Promise.all([
    getExpenses({ limit: 100 }),
    getExpenseCategories(),
  ])

  return (
    <ExpensesView
      initialExpenses={initialExpenses}
      categories={categories}
    />
  )
}

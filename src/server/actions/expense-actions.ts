// src/server/actions/expense-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { PaymentMethod, Role } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { rupeesToPaise } from '@/lib/currency'
import { saveUploadedFile } from '@/lib/storage'
import { requireAuth } from '@/lib/auth'

export async function getExpenseCategories() {
  await requireAuth()
  return await prisma.expenseCategory.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { expenses: true } },
    },
  })
}

export async function getExpenses(params: {
  categoryId?: string
  method?: PaymentMethod | 'ALL'
  startDate?: string
  endDate?: string
  search?: string
  limit?: number
  page?: number
} = {}) {
  await requireAuth()
  const limit = params.limit || 25
  const page = params.page || 1
  const skip = (page - 1) * limit

  const where: any = {}

  if (params.categoryId && params.categoryId !== 'ALL') {
    where.categoryId = params.categoryId
  }

  if (params.method && params.method !== 'ALL') {
    where.method = params.method
  }

  if (params.startDate || params.endDate) {
    where.date = {}
    if (params.startDate) where.date.gte = new Date(params.startDate)
    if (params.endDate) {
      const e = new Date(params.endDate)
      e.setHours(23, 59, 59, 999)
      where.date.lte = e
    }
  }

  if (params.search && params.search.trim() !== '') {
    const s = params.search.trim()
    where.OR = [
      { vendor: { contains: s, mode: 'insensitive' } },
      { reference: { contains: s, mode: 'insensitive' } },
      { notes: { contains: s, mode: 'insensitive' } },
      { category: { name: { contains: s, mode: 'insensitive' } } },
    ]
  }

  const [totalCount, expenses, totalAmountAggregate] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: {
        category: true,
        createdBy: { select: { name: true, role: true } },
      },
      orderBy: { date: 'desc' },
      take: limit,
      skip,
    }),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ])

  return {
    expenses,
    totalCount,
    totalPaise: totalAmountAggregate._sum.amount || 0,
    totalPages: Math.ceil(totalCount / limit),
    page,
    limit,
  }
}

export async function createExpense(formData: FormData) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied: Only Admin and Manager can record expenses')
  }

  const amountRupees = parseFloat(formData.get('amount') as string)
  if (isNaN(amountRupees) || amountRupees <= 0) {
    throw new Error('Valid expense amount is required')
  }

  const categoryId = formData.get('categoryId') as string
  const dateStr = formData.get('date') as string
  const method = formData.get('method') as PaymentMethod
  const vendor = (formData.get('vendor') as string) || null
  const reference = (formData.get('reference') as string) || null
  const notes = (formData.get('notes') as string) || null

  let receiptUrl: string | null = null
  const receiptFile = formData.get('receipt') as File | null
  if (receiptFile && receiptFile.size > 0 && receiptFile.name !== 'undefined') {
    receiptUrl = await saveUploadedFile(receiptFile)
  }

  const amountPaise = rupeesToPaise(amountRupees)

  const expense = await prisma.$transaction(async (tx) => {
    const created = await tx.expense.create({
      data: {
        amount: amountPaise,
        date: dateStr ? new Date(dateStr) : new Date(),
        categoryId,
        method,
        vendor,
        reference,
        notes,
        receiptUrl,
        createdById: session.userId,
      },
      include: { category: true },
    })

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'EXPENSE_CREATED',
        entity: 'Expense',
        entityId: created.id,
        metadata: {
          category: created.category.name,
          amount: amountPaise,
          vendor,
          method,
        },
      },
    })

    return created
  })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  return { success: true, expense }
}

export async function deleteExpense(expenseId: string) {
  const session = await getSession()
  if (!session || session.role !== Role.ADMIN) {
    throw new Error('Permission denied: Only Admin can delete expense records')
  }

  const result = await prisma.$transaction(async (tx) => {
    const exp = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { category: true },
    })

    if (!exp) throw new Error('Expense not found')

    await tx.expense.delete({ where: { id: expenseId } })

    await tx.auditLog.create({
      data: {
        userId: session.userId,
        action: 'EXPENSE_DELETED',
        entity: 'Expense',
        entityId: expenseId,
        metadata: {
          category: exp.category.name,
          amount: exp.amount,
          vendor: exp.vendor,
        },
      },
    })

    return exp
  })

  revalidatePath('/expenses')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function createExpenseCategory(name: string, description?: string) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied')
  }

  const cleanName = name.trim().toUpperCase()
  const existing = await prisma.expenseCategory.findUnique({ where: { name: cleanName } })
  if (existing) {
    throw new Error(`Category ${cleanName} already exists`)
  }

  const category = await prisma.expenseCategory.create({
    data: {
      name: cleanName,
      description,
    },
  })

  revalidatePath('/expenses')
  return { success: true, category }
}

// src/server/actions/settings-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { Role } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/session'

const updateHotelSettingsSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gstNumber: z.string().optional(),
  taxPercentage: z.number().min(0).max(5000), // In basis points (1200 = 12%)
  checkInTime: z.string(),
  checkOutTime: z.string(),
  invoiceTerms: z.string().optional(),
  allowNegativeBalanceCheckout: z.boolean().default(false),
})

export async function getHotelSettings() {
  return await prisma.hotelSetting.findUnique({
    where: { id: 'durga-lodge-settings' },
  })
}

export async function updateHotelSettings(data: z.infer<typeof updateHotelSettingsSchema>) {
  const session = await getSession()
  if (!session || (session.role !== Role.ADMIN && session.role !== Role.MANAGER)) {
    throw new Error('Permission denied')
  }

  const parsed = updateHotelSettingsSchema.parse(data)

  const updated = await prisma.hotelSetting.upsert({
    where: { id: 'durga-lodge-settings' },
    update: parsed,
    create: {
      id: 'durga-lodge-settings',
      ...parsed,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: 'SETTINGS_UPDATED',
      entity: 'HotelSetting',
      entityId: 'durga-lodge-settings',
      metadata: { taxPercentage: parsed.taxPercentage, gstNumber: parsed.gstNumber },
    },
  })

  revalidatePath('/settings')
  return { success: true, settings: updated }
}

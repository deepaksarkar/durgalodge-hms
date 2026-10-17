import React from 'react'
import { getBookingById, syncActiveFlexibleBookings } from '@/server/actions/booking-actions'
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { PrintableInvoice } from '@/components/invoices/printable-invoice'

export const dynamic = 'force-dynamic'

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // Sync flexible stay if active before generating folio invoice
  await syncActiveFlexibleBookings(id)

  const [booking, hotel] = await Promise.all([
    getBookingById(id),
    prisma.hotelSetting.findUnique({ where: { id: 'durga-lodge-settings' } }),
  ])

  if (!booking) {
    notFound()
  }

  return <PrintableInvoice booking={booking} hotel={hotel} />
}

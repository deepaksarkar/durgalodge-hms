// src/components/expenses/expenses-view.tsx
'use client'

import React, { useState } from 'react'
import { formatCurrency } from '@/lib/currency'
import { formatHotelDate } from '@/lib/date-utils'
import { createExpense, createExpenseCategory, deleteExpense } from '@/server/actions/expense-actions'
import { PaymentMethod } from '@prisma/client'
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileText,
  Paperclip,
  Trash2,
  XCircle,
  ExternalLink,
  FolderPlus,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export function ExpensesView({
  initialExpenses,
  categories,
}: {
  initialExpenses: any
  categories: any[]
}) {
  const router = useRouter()
  const [expenses, setExpenses] = useState(initialExpenses.expenses)
  const [totalPaise, setTotalPaise] = useState(initialExpenses.totalPaise)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [methodFilter, setMethodFilter] = useState('ALL')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form State
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [vendor, setVendor] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  // Category Form State
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')

  const filteredExpenses = expenses.filter((e: any) => {
    const matchCat = categoryFilter === 'ALL' || e.categoryId === categoryFilter
    const matchMethod = methodFilter === 'ALL' || e.method === methodFilter
    const s = search.toLowerCase().trim()
    const matchSearch =
      !s ||
      e.category.name.toLowerCase().includes(s) ||
      e.vendor?.toLowerCase().includes(s) ||
      e.reference?.toLowerCase().includes(s) ||
      e.notes?.toLowerCase().includes(s)
    return matchCat && matchMethod && matchSearch
  })

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('amount', amount)
      formData.append('categoryId', categoryId)
      formData.append('method', method)
      formData.append('vendor', vendor)
      formData.append('reference', reference)
      formData.append('notes', notes)
      if (receiptFile) {
        formData.append('receipt', receiptFile)
      }

      await createExpense(formData)
      setShowAddModal(false)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await createExpenseCategory(newCatName, newCatDesc || undefined)
      setShowAddCategoryModal(false)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to create category')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense entry?')) return
    try {
      await deleteExpense(id)
      router.refresh()
      window.location.reload()
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="w-7 h-7 text-rose-500" />
            <span>Expense & Payables Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Operational costs, utilities, supplies, salaries, invoices, and digital receipt storage.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>New Category</span>
          </button>
          <button
            onClick={() => {
              setErrorMsg(null)
              setShowAddModal(true)
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-900 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative sm:col-span-1 lg:col-span-2">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Vendor, Category, Reference..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Payment Methods</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CARD">Card</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Vendor / Payee</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Method & Ref</th>
                <th className="p-4">Receipt</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp: any) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40">
                    <td className="p-4 text-slate-300 font-medium">
                      {formatHotelDate(exp.date)}
                    </td>

                    <td className="p-4">
                      <span className="font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">
                        {exp.category.name}
                      </span>
                    </td>

                    <td className="p-4">
                      <p className="font-semibold text-slate-200">{exp.vendor || 'Direct Payee'}</p>
                      {exp.notes && (
                        <p className="text-[10px] text-slate-500 truncate max-w-xs">{exp.notes}</p>
                      )}
                    </td>

                    <td className="p-4 font-mono font-bold text-rose-400 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>

                    <td className="p-4 space-y-0.5">
                      <span className="font-mono text-slate-300 text-[11px] block">{exp.method}</span>
                      {exp.reference && (
                        <span className="text-[10px] text-slate-500 font-mono block">
                          Ref: {exp.reference}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {exp.receiptUrl ? (
                        <a
                          href={exp.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-[11px] transition-colors"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>View Doc</span>
                        </a>
                      ) : (
                        <span className="text-slate-600 text-[10px] italic">No receipt</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        title="Delete Expense"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-rose-500" />
                <span>Record Operational Expense</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Category *</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Payment Method *</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI (QR / PhonePe)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT)</option>
                    <option value="CARD">Card</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="e.g. TPCODL or Local Mart"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Invoice / Ref #</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. BILL-9281"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Description / Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Items purchased or purpose"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Upload Receipt (PDF / JPEG / PNG, Max 5MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl shadow-lg shadow-rose-600/20"
                >
                  {isSubmitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE CATEGORY MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">New Expense Category</h3>
              <button onClick={() => setShowAddCategoryModal(false)} className="text-slate-400 hover:text-white">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. LAUNDRY"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 uppercase font-semibold"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Operational purpose"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

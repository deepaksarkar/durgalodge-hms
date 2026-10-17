// src/app/(dashboard)/error.tsx
'use client'

import React, { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard runtime error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 mb-4">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-400 max-w-md mb-6">
        An error occurred while loading this dashboard view. Your session is active.
      </p>
      {error?.message && (
        <pre className="text-xs bg-slate-900 border border-slate-800 p-3 rounded-xl text-rose-300 font-mono max-w-lg mb-6 overflow-x-auto text-left">
          {error.message}
        </pre>
      )}
      <button
        onClick={() => reset()}
        className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-amber-600/20"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Try Again</span>
      </button>
    </div>
  )
}

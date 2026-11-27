'use client'

import { useEffect, useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'

interface UploadRecord {
  id: string
  filename: string
  row_count: number
  status: string
  created_at: string
}

interface DocumentListProps {
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  refreshTrigger?: number
  clientId?: string | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'done') {
    return (
      <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 uppercase tracking-wide">
        done
      </span>
    )
  }
  if (status === 'categorizing') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-900/40 text-blue-400 border border-blue-700/30 uppercase tracking-wide">
        <span className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
        processing
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/30 uppercase tracking-wide">
      <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
      parsing
    </span>
  )
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DocumentList({ selectedId, onSelect, onDelete, refreshTrigger, clientId }: DocumentListProps) {
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchUploads = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      const url = clientId ? `/api/uploads?client_id=${clientId}` : '/api/uploads'
      const res = await fetch(url, { headers })
      if (res.ok) {
        const data = await res.json()
        setUploads(data.uploads ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchUploads()
  }, [fetchUploads, refreshTrigger])

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      if (!confirm('Delete this document and all its transactions? This cannot be undone.')) return
      setDeletingId(id)
      try {
        const res = await fetch(`/api/uploads/${id}`, { method: 'DELETE' })
        if (res.ok) {
          setUploads(prev => prev.filter(u => u.id !== id))
          onDelete(id)
        }
      } catch {
        // silent
      } finally {
        setDeletingId(null)
      }
    },
    [onDelete]
  )

  if (loading && uploads.length === 0) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Documents</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-600 text-xs py-2">
          <span className="w-3 h-3 border border-zinc-600 border-t-transparent rounded-full animate-spin" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4">
      {/* Section label */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">Documents</span>
        {uploads.length > 0 && (
          <span className="text-zinc-700 text-xs">{uploads.length}</span>
        )}
      </div>

      {/* Thin top separator */}
      <div className="border-t border-zinc-800 mb-1" />

      {uploads.length === 0 ? (
        <p className="text-zinc-700 text-xs py-3">
          No documents yet — upload a statement above.
        </p>
      ) : (
        <ul>
          {uploads.map(upload => {
            const isSelected = upload.id === selectedId
            const isDeleting = deletingId === upload.id

            return (
              <li
                key={upload.id}
                onClick={() => onSelect(upload.id)}
                className={`group relative flex items-center gap-3 pl-3 pr-2 py-2 cursor-pointer rounded-r transition-colors border-l-2 ${
                  isSelected
                    ? 'border-l-[#D4883A] bg-amber-900/10'
                    : 'border-l-transparent hover:border-l-zinc-700 hover:bg-zinc-800/30'
                }`}
              >
                {/* Filename */}
                <span
                  className={`flex-1 text-xs font-medium truncate min-w-0 ${
                    isSelected ? 'text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-200'
                  }`}
                  title={upload.filename}
                >
                  {upload.filename}
                </span>

                {/* Meta: date + txn count + badge — hidden on narrow, inline */}
                <div className="flex items-center gap-2 shrink-0 text-[10px] text-zinc-600">
                  <StatusBadge status={upload.status} />
                  <span>{upload.row_count} txn{upload.row_count !== 1 ? 's' : ''}</span>
                  <span className="hidden sm:inline">{formatDate(upload.created_at)}</span>
                </div>

                {/* Delete — only on hover */}
                <button
                  onClick={e => handleDelete(e, upload.id)}
                  disabled={isDeleting}
                  title="Delete document"
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <span className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

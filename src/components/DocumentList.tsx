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
      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/30">
        done
      </span>
    )
  }
  if (status === 'categorizing') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/40 text-blue-400 border border-blue-700/30">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        categorizing
      </span>
    )
  }
  // 'parsed' or anything else → parsing
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-900/40 text-amber-400 border border-amber-700/30">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      parsing
    </span>
  )
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      // silent — not critical
    } finally {
      setLoading(false)
    }
  }, [])

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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
          Documents
        </h2>
        <div className="flex items-center justify-center py-6 text-zinc-600 text-sm">
          <span className="w-4 h-4 border border-zinc-600 border-t-transparent rounded-full animate-spin mr-2" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
          Documents
        </h2>
        <span className="text-zinc-600 text-xs">{uploads.length}</span>
      </div>

      {uploads.length === 0 ? (
        <div className="p-6 text-center text-zinc-700 text-sm">
          No documents yet.
          <br />
          <span className="text-xs">Upload a statement to get started.</span>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {uploads.map(upload => {
            const isSelected = upload.id === selectedId
            const isDeleting = deletingId === upload.id

            return (
              <li
                key={upload.id}
                onClick={() => onSelect(upload.id)}
                className={`group relative flex flex-col gap-1.5 p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-950/30 border-l-2 border-indigo-500'
                    : 'hover:bg-zinc-800/40 border-l-2 border-transparent'
                }`}
              >
                {/* Filename */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="text-xs font-medium text-zinc-200 truncate leading-tight"
                    title={upload.filename}
                  >
                    {upload.filename}
                  </span>
                  <button
                    onClick={e => handleDelete(e, upload.id)}
                    disabled={isDeleting}
                    title="Delete document"
                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-50"
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
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={upload.status} />
                  <span className="text-zinc-600 text-[10px]">
                    {upload.row_count} txn{upload.row_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Date */}
                <div className="text-zinc-600 text-[10px]">
                  {formatDate(upload.created_at)}
                </div>

                {/* Selected indicator label */}
                {isSelected && (
                  <span className="text-indigo-400 text-[10px] font-medium">● Viewing</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'

export interface Client {
  id: string
  name: string
  qbo_realm_id: string | null
  created_at: string
}

interface ClientSwitcherProps {
  clients: Client[]
  activeClientId: string | null
  onSelect: (id: string) => void
  onAdd: (name: string) => void
  onDelete: (id: string) => void
}

export function ClientSwitcher({
  clients,
  activeClientId,
  onSelect,
  onAdd,
  onDelete,
}: ClientSwitcherProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeClient = clients.find(c => c.id === activeClientId) ?? null

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Focus input when add form opens
  useEffect(() => {
    if (showAddForm) inputRef.current?.focus()
  }, [showAddForm])

  const handleAdd = async () => {
    const name = newClientName.trim()
    if (!name) return
    setIsAdding(true)
    try {
      await onAdd(name)
      setNewClientName('')
      setShowAddForm(false)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this client? All associated data will be unlinked.')) return
    setDeletingId(id)
    try {
      await onDelete(id)
    } finally {
      setDeletingId(null)
      setShowDropdown(false)
    }
  }

  // No clients state
  if (clients.length === 0 && !showAddForm) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-zinc-500 text-sm">No clients yet.</span>
        <button
          onClick={() => setShowAddForm(true)}
          className="text-sm font-semibold transition-colors hover:opacity-80"
          style={{ color: '#D4883A' }}
        >
          Add your first client →
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Active client name + dropdown trigger */}
      {clients.length > 0 && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-2 group"
          >
            <span
              className="text-2xl font-bold tracking-tight"
              style={{ color: '#D4883A' }}
            >
              {activeClient?.name ?? 'Select client'}
            </span>
            <svg
              className={`w-4 h-4 text-zinc-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown panel */}
          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 z-30 min-w-[200px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
              {clients.map(client => {
                const isActive = client.id === activeClientId
                const isDeleting = deletingId === client.id
                return (
                  <div
                    key={client.id}
                    className={`group flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
                      isActive ? 'bg-amber-900/20' : 'hover:bg-zinc-800'
                    }`}
                    onClick={() => {
                      onSelect(client.id)
                      setShowDropdown(false)
                    }}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isActive ? 'bg-amber-500' : 'bg-zinc-600'
                      }`}
                    />
                    <span
                      className={`flex-1 text-sm font-medium truncate ${
                        isActive ? 'text-amber-400' : 'text-zinc-300'
                      }`}
                    >
                      {client.name}
                    </span>
                    <button
                      onClick={e => handleDelete(client.id, e)}
                      disabled={isDeleting}
                      title="Delete client"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 disabled:opacity-30 p-0.5 rounded"
                    >
                      {isDeleting ? '…' : '✕'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add client button / form */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
        >
          + Add Client
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Client name…"
            value={newClientName}
            onChange={e => setNewClientName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setShowAddForm(false)
                setNewClientName('')
              }
            }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-600 transition-colors w-44"
          />
          <button
            onClick={handleAdd}
            disabled={isAdding || !newClientName.trim()}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-black transition-all hover:brightness-110"
            style={{ backgroundColor: '#D4883A' }}
          >
            {isAdding ? 'Adding…' : 'Add'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(false)
              setNewClientName('')
            }}
            className="text-xs px-2 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

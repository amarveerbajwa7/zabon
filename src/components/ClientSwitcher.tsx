'use client'

import { useState } from 'react'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
          Clients
        </span>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="text-xs px-2 py-1 rounded-md transition-colors"
          style={{ color: '#D4883A' }}
          title="Add client"
        >
          + Add
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/50">
          <input
            type="text"
            autoFocus
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
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-amber-600 transition-colors"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleAdd}
              disabled={isAdding || !newClientName.trim()}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-black transition-all hover:brightness-110"
              style={{ backgroundColor: '#D4883A' }}
            >
              {isAdding ? 'Adding…' : 'Add Client'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewClientName('')
              }}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Client list */}
      <div className="divide-y divide-zinc-800/50">
        {clients.length === 0 && !showAddForm && (
          <div className="px-4 py-6 text-center">
            <p className="text-zinc-600 text-xs">No clients yet.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 text-xs font-semibold transition-colors"
              style={{ color: '#D4883A' }}
            >
              Add your first client →
            </button>
          </div>
        )}

        {clients.map(client => {
          const isActive = client.id === activeClientId
          const isDeleting = deletingId === client.id

          return (
            <div
              key={client.id}
              onClick={() => onSelect(client.id)}
              className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                isActive
                  ? 'bg-amber-900/20'
                  : 'hover:bg-zinc-800/50'
              }`}
            >
              {/* Active indicator */}
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                  isActive ? 'bg-amber-500' : 'bg-zinc-700 group-hover:bg-zinc-500'
                }`}
              />

              {/* Name + status */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isActive ? 'text-amber-400' : 'text-zinc-300'
                  }`}
                >
                  {client.name}
                </p>
                <p className="text-xs mt-0.5">
                  {client.qbo_realm_id ? (
                    <span className="text-emerald-500">QBO connected</span>
                  ) : (
                    <span className="text-zinc-600">No QBO connection</span>
                  )}
                </p>
              </div>

              {/* Delete */}
              <button
                onClick={e => handleDelete(client.id, e)}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-600 hover:text-red-400 disabled:opacity-30 text-xs px-1"
                title="Delete client"
              >
                {isDeleting ? '…' : '✕'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

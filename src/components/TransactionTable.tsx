'use client'

import { useState, useMemo } from 'react'

const CHART_OF_ACCOUNTS = [
  'Revenue',
  'COGS',
  'Advertising & Marketing',
  'Bank Charges & Fees',
  'Insurance',
  'Meals & Entertainment',
  'Office Supplies',
  'Payroll & Wages',
  'Professional Fees',
  'Rent & Utilities',
  'Software & Subscriptions',
  'Travel',
  "Owner's Draw",
  'Miscellaneous',
] as const

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  suggested_category: string | null
  final_category: string | null
  ai_confidence: 'high' | 'medium' | 'low' | null
  ai_reasoning: string | null
  status: string
  qbo_id: string | null
  push_error: string | null
}

interface TransactionTableProps {
  transactions: Transaction[]
  onApprove: (ids: string[]) => void
  onReject: (ids: string[]) => void
  onCategoryChange: (id: string, category: string) => void
  onPush: (ids: string[]) => void
  isPushing: boolean
}

const CONFIDENCE_STYLES = {
  high: 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40',
  medium: 'bg-amber-900/40 text-amber-400 border border-amber-700/40',
  low: 'bg-red-900/40 text-red-400 border border-red-700/40',
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-zinc-800 text-zinc-400',
  categorized: 'bg-blue-900/40 text-blue-400',
  approved: 'bg-emerald-900/40 text-emerald-400',
  rejected: 'bg-zinc-900 text-zinc-600 line-through',
  pushed: 'bg-indigo-900/40 text-indigo-400',
  push_failed: 'bg-red-900/40 text-red-400',
}

export function TransactionTable({
  transactions,
  onApprove,
  onReject,
  onCategoryChange,
  onPush,
  isPushing,
}: TransactionTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'pending' | 'categorized' | 'approved' | 'pushed'>('all')
  const [tooltipId, setTooltipId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return transactions
    return transactions.filter(tx => tx.status === filter)
  }, [transactions, filter])

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(tx => tx.id)))
    }
  }

  const selectedIds = Array.from(selected)
  const approvedSelected = selectedIds.filter(
    id => transactions.find(t => t.id === id)?.status === 'approved'
  )

  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, categorized: 0, approved: 0, pushed: 0 }
    transactions.forEach(tx => {
      c.all++
      if (tx.status in c) c[tx.status as keyof typeof c]++
    })
    return c
  }, [transactions])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-zinc-800 pb-0">
        {(['all', 'categorized', 'approved', 'pushed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              filter === f
                ? 'border-indigo-500 text-white bg-indigo-950/30'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-1.5 text-xs text-zinc-500">({counts[f] ?? 0})</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-zinc-800/60 rounded-lg border border-zinc-700">
          <span className="text-sm text-zinc-300">{selected.size} selected</span>
          <button
            onClick={() => { onApprove(selectedIds); setSelected(new Set()) }}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-700 hover:bg-emerald-600 text-white transition-colors"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => { onReject(selectedIds); setSelected(new Set()) }}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
          >
            ✕ Reject
          </button>
          {approvedSelected.length > 0 && (
            <button
              onClick={() => { onPush(approvedSelected); setSelected(new Set()) }}
              disabled={isPushing}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-indigo-700 hover:bg-indigo-600 text-white transition-colors disabled:opacity-50"
            >
              {isPushing ? '⏳ Pushing...' : '→ Push to QBO'}
            </button>
          )}
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 border-b border-zinc-800">
              <th className="w-10 p-3">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleSelectAll}
                  className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                />
              </th>
              <th className="text-left p-3 text-zinc-500 font-medium">Date</th>
              <th className="text-left p-3 text-zinc-500 font-medium">Description</th>
              <th className="text-right p-3 text-zinc-500 font-medium">Amount</th>
              <th className="text-left p-3 text-zinc-500 font-medium">Category</th>
              <th className="text-left p-3 text-zinc-500 font-medium">Confidence</th>
              <th className="text-left p-3 text-zinc-500 font-medium">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-zinc-600">
                  No transactions in this view
                </td>
              </tr>
            ) : (
              filtered.map(tx => (
                <tr
                  key={tx.id}
                  className={`group transition-colors ${
                    selected.has(tx.id) ? 'bg-indigo-950/20' : 'hover:bg-zinc-900/40'
                  } ${tx.status === 'rejected' ? 'opacity-40' : ''}`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                      className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-zinc-900"
                    />
                  </td>
                  <td className="p-3 text-zinc-400 whitespace-nowrap font-mono text-xs">
                    {tx.date}
                  </td>
                  <td className="p-3 text-zinc-200 max-w-xs">
                    <div className="truncate" title={tx.description}>
                      {tx.description}
                    </div>
                    {tx.push_error && (
                      <div className="text-xs text-red-400 mt-0.5 truncate">{tx.push_error}</div>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap font-medium">
                    <span className={tx.type === 'credit' ? 'text-emerald-400' : 'text-white'}>
                      {tx.type === 'credit' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={tx.final_category || tx.suggested_category || ''}
                      onChange={e => onCategoryChange(tx.id, e.target.value)}
                      disabled={tx.status === 'pushed'}
                      className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-md px-2 py-1.5 w-full focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">— Select —</option>
                      {CHART_OF_ACCOUNTS.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3">
                    {tx.ai_confidence ? (
                      <div className="relative">
                        <span
                          onMouseEnter={() => setTooltipId(tx.id)}
                          onMouseLeave={() => setTooltipId(null)}
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${CONFIDENCE_STYLES[tx.ai_confidence]}`}
                        >
                          {tx.ai_confidence}
                        </span>
                        {tooltipId === tx.id && tx.ai_reasoning && (
                          <div className="absolute z-10 left-0 top-6 w-56 p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 shadow-xl">
                            {tx.ai_reasoning}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[tx.status] || 'bg-zinc-800 text-zinc-400'}`}>
                      {tx.status === 'pushed' && tx.qbo_id ? '✓ pushed' : tx.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {tx.status === 'categorized' && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onApprove([tx.id])}
                          className="p-1 text-emerald-400 hover:bg-emerald-900/30 rounded"
                          title="Approve"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => onReject([tx.id])}
                          className="p-1 text-zinc-500 hover:bg-zinc-800 rounded"
                          title="Reject"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    {tx.status === 'approved' && (
                      <button
                        onClick={() => onPush([tx.id])}
                        disabled={isPushing}
                        className="text-xs px-2 py-1 bg-indigo-800 hover:bg-indigo-700 text-indigo-200 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        Push
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

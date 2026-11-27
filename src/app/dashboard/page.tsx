'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { UploadZone } from '@/components/UploadZone'
import { TransactionTable, Transaction, QBOAccount } from '@/components/TransactionTable'
import { DocumentList } from '@/components/DocumentList'
import { ClientSwitcher, Client } from '@/components/ClientSwitcher'

function DashboardContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [selectedUploadId, setSelectedUploadId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isPushing, setIsPushing] = useState(false)
  const [realmId, setRealmId] = useState<string | null>(null)
  const [qboConnected, setQboConnected] = useState(false)
  const [threshold, setThreshold] = useState(95)
  const [uploadsRefresh, setUploadsRefresh] = useState(0)
  const [qboAccounts, setQboAccounts] = useState<QBOAccount[]>([])

  // Multi-client state
  const [clients, setClients] = useState<Client[]>([])
  const [activeClientId, setActiveClientId] = useState<string | null>(null)

  const activeClient = clients.find(c => c.id === activeClientId) ?? null

  // Check auth session on mount
  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)
      setAccessToken(session.access_token)
    })
  }, [router])

  // Fetch clients once we have an access token
  const fetchClients = useCallback(async (token: string) => {
    try {
      const res = await fetch('/api/clients', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const list: Client[] = data.clients ?? []
      setClients(list)
      // Default to first client
      if (list.length > 0) {
        setActiveClientId(prev => prev ?? list[0].id)
      }
    } catch (err) {
      console.warn('Could not fetch clients:', err)
    }
  }, [])

  useEffect(() => {
    if (accessToken) fetchClients(accessToken)
  }, [accessToken, fetchClients])

  // Parse URL params from OAuth callback
  useEffect(() => {
    const connectedParam = searchParams.get('connected')
    const realmParam = searchParams.get('realmId')
    const errorParam = searchParams.get('error')

    if (connectedParam === 'true' && realmParam) {
      setQboConnected(true)
      setRealmId(realmParam)
      setNotice(`✓ QuickBooks connected (Realm: ${realmParam})`)
      // If a client_id came back, associate realm with active client in local state
      const clientIdParam = searchParams.get('client_id')
      if (clientIdParam) {
        setClients(prev =>
          prev.map(c => (c.id === clientIdParam ? { ...c, qbo_realm_id: realmParam } : c))
        )
      }
      fetch(`/api/qbo/accounts?realm_id=${realmParam}`)
        .then(r => r.json())
        .then(data => {
          if (data.accounts?.length) setQboAccounts(data.accounts)
        })
        .catch(err => console.warn('Could not fetch QBO accounts:', err))
    }
    if (errorParam) {
      const detail = searchParams.get('detail')
      setError(
        `OAuth error: ${decodeURIComponent(errorParam)}${detail ? ` — ${decodeURIComponent(detail)}` : ''}`
      )
    }
  }, [searchParams])

  const fetchTransactions = useCallback(async (uid: string) => {
    const res = await fetch(`/api/transactions/list?upload_id=${uid}`)
    if (res.ok) {
      const data = await res.json()
      setTransactions(data.transactions || [])
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const handleUploadComplete = useCallback(
    (uid: string, count: number) => {
      setSelectedUploadId(uid)
      setNotice(`✓ ${count} transactions uploaded and categorized`)
      setUploadsRefresh(r => r + 1)
      fetchTransactions(uid)
    },
    [fetchTransactions]
  )

  const handleDocumentSelect = useCallback(
    (uid: string) => {
      setSelectedUploadId(uid)
      fetchTransactions(uid)
    },
    [fetchTransactions]
  )

  const handleDocumentDelete = useCallback(
    (uid: string) => {
      if (selectedUploadId === uid) {
        setSelectedUploadId(null)
        setTransactions([])
      }
      setUploadsRefresh(r => r + 1)
    },
    [selectedUploadId]
  )

  const handleApprove = useCallback(
    async (ids: string[]) => {
      await fetch('/api/transactions/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'approve' }),
      })
      if (selectedUploadId) fetchTransactions(selectedUploadId)
    },
    [selectedUploadId, fetchTransactions]
  )

  const handleReject = useCallback(
    async (ids: string[]) => {
      await fetch('/api/transactions/review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'reject' }),
      })
      if (selectedUploadId) fetchTransactions(selectedUploadId)
    },
    [selectedUploadId, fetchTransactions]
  )

  const handleCategoryChange = useCallback(async (id: string, category: string) => {
    setTransactions(prev =>
      prev.map(tx => (tx.id === id ? { ...tx, final_category: category } : tx))
    )
    await fetch('/api/transactions/review', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id], action: 'categorize', category }),
    })
  }, [])

  const handlePush = useCallback(
    async (ids: string[]) => {
      if (!realmId) {
        setError('Connect QuickBooks first before pushing transactions.')
        return
      }
      setIsPushing(true)
      try {
        const res = await fetch('/api/transactions/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transaction_ids: ids, realm_id: realmId }),
        })
        const data = await res.json()
        setNotice(
          `✓ Pushed ${data.pushed} transactions to QuickBooks${data.failed > 0 ? ` (${data.failed} failed)` : ''}`
        )
        if (selectedUploadId) fetchTransactions(selectedUploadId)
      } catch {
        setError('Push to QuickBooks failed. Try again.')
      } finally {
        setIsPushing(false)
      }
    },
    [realmId, selectedUploadId, fetchTransactions]
  )

  // Client management handlers
  const handleClientSelect = useCallback(
    (id: string) => {
      setActiveClientId(id)
      // Clear document selection when switching clients
      setSelectedUploadId(null)
      setTransactions([])
      setUploadsRefresh(r => r + 1)
    },
    []
  )

  const handleClientAdd = useCallback(
    async (name: string) => {
      if (!accessToken) return
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to create client')
        return
      }
      const data = await res.json()
      const newClient: Client = data.client
      setClients(prev => [...prev, newClient])
      setActiveClientId(newClient.id)
    },
    [accessToken]
  )

  const handleClientDelete = useCallback(
    async (id: string) => {
      if (!accessToken) return
      const res = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to delete client')
        return
      }
      setClients(prev => prev.filter(c => c.id !== id))
      if (activeClientId === id) {
        const remaining = clients.filter(c => c.id !== id)
        setActiveClientId(remaining.length > 0 ? remaining[0].id : null)
        setSelectedUploadId(null)
        setTransactions([])
      }
    },
    [accessToken, activeClientId, clients]
  )

  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === 'pending' || t.status === 'categorized').length,
    approved: transactions.filter(t => t.status === 'approved').length,
    pushed: transactions.filter(t => t.status === 'pushed').length,
    flagged: transactions.filter(
      t => t.ai_confidence !== null && t.ai_confidence < threshold
    ).length,
    totalExpenses: transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0),
  }

  // Build QBO connect URL with active client_id
  const qboConnectUrl = `/api/auth/quickbooks?user_id=${userId ?? ''}${activeClientId ? `&client_id=${activeClientId}` : ''}`

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black tracking-tight">
              z<span style={{ color: '#D4883A' }}>a</span>
              <span style={{ color: '#2BAE8E' }}>b</span>on
            </span>
            <span className="text-zinc-700 text-xs">AI Bookkeeper</span>
            {activeClient && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-zinc-400 text-sm font-medium">{activeClient.name}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSignOut}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              Sign out
            </button>
            {qboConnected ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                QuickBooks Connected
              </span>
            ) : (
              <a
                href={qboConnectUrl}
                className="flex items-center gap-2 px-4 py-2 text-black text-sm font-semibold rounded-lg transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#D4883A' }}
              >
                Connect QuickBooks
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Notifications */}
        {notice && (
          <div className="flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-800/50 rounded-xl text-emerald-300 text-sm">
            {notice}
            <button onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-400 ml-4">
              ✕
            </button>
          </div>
        )}
        {error && (
          <div className="flex items-center justify-between p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-red-300 text-sm">
            {error}
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-400 ml-4">
              ✕
            </button>
          </div>
        )}

        {/* Stats */}
        {transactions.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total', value: stats.total, color: 'text-white' },
              { label: 'Awaiting Review', value: stats.pending, color: 'text-amber-400' },
              { label: 'Approved', value: stats.approved, color: 'text-emerald-400' },
              {
                label: 'Flagged',
                value: stats.flagged,
                color: stats.flagged > 0 ? 'text-red-400' : 'text-zinc-600',
              },
              {
                label: 'Total Expenses',
                value: `$${stats.totalExpenses.toLocaleString('en-CA', { minimumFractionDigits: 2 })}`,
                color: 'text-indigo-400',
              },
            ].map(stat => (
              <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-zinc-500 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Main 2-column layout */}
        <div className="flex gap-6 items-start">
          {/* Left sidebar — Client switcher + Document list */}
          <div className="w-72 shrink-0 space-y-4">
            <ClientSwitcher
              clients={clients}
              activeClientId={activeClientId}
              onSelect={handleClientSelect}
              onAdd={handleClientAdd}
              onDelete={handleClientDelete}
            />

            {activeClientId && (
              <DocumentList
                selectedId={selectedUploadId}
                onSelect={handleDocumentSelect}
                onDelete={handleDocumentDelete}
                refreshTrigger={uploadsRefresh}
              />
            )}
          </div>

          {/* Right column — Upload + Transactions */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* No client selected / no clients */}
            {!activeClientId && clients.length === 0 && (
              <div className="text-center py-24 text-zinc-700">
                <p className="text-lg">Welcome to ZABON.</p>
                <p className="text-sm mt-2">Add your first client using the panel on the left to get started.</p>
              </div>
            )}

            {activeClientId && (
              <>
                {/* Upload zone */}
                <section>
                  <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
                    Upload Statement
                  </h2>
                  <UploadZone
                    onUploadComplete={handleUploadComplete}
                    onError={setError}
                    disabled={false}
                    clientId={activeClientId}
                  />
                </section>

                {/* Transaction table */}
                {transactions.length > 0 && (
                  <section>
                    <div className="flex items-center gap-4 mb-3 flex-wrap">
                      <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest">
                        Review Transactions
                      </h2>

                      {/* Threshold slider */}
                      <div className="flex items-center gap-2 ml-auto">
                        <label className="text-zinc-500 text-xs whitespace-nowrap">
                          Flag below:{' '}
                          <span className={threshold <= 70 ? 'text-red-400' : threshold <= 85 ? 'text-amber-400' : 'text-zinc-300'}>
                            {threshold}%
                          </span>
                        </label>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          step={1}
                          value={threshold}
                          onChange={e => setThreshold(Number(e.target.value))}
                          className="w-24 h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{ accentColor: '#D4883A' }}
                        />
                      </div>

                      {/* Push button */}
                      {stats.approved > 0 && (
                        <button
                          onClick={() => {
                            const approvedIds = transactions
                              .filter(t => t.status === 'approved')
                              .map(t => t.id)
                            handlePush(approvedIds)
                          }}
                          disabled={isPushing || !qboConnected}
                          className="flex items-center gap-2 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-semibold rounded-lg transition-all hover:brightness-110 active:scale-95"
                          style={{ backgroundColor: '#D4883A' }}
                        >
                          {isPushing ? (
                            <>
                              <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              Pushing…
                            </>
                          ) : (
                            `→ Push ${stats.approved} to QuickBooks`
                          )}
                        </button>
                      )}
                    </div>

                    <TransactionTable
                      transactions={transactions}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onCategoryChange={handleCategoryChange}
                      onPush={handlePush}
                      isPushing={isPushing}
                      threshold={threshold}
                      qboAccounts={qboAccounts}
                    />
                  </section>
                )}

                {!transactions.length && !selectedUploadId && (
                  <div className="text-center py-16 text-zinc-700">
                    <p className="text-lg">Upload a bank or credit card statement to get started.</p>
                    <p className="text-sm mt-2">AI will categorize your transactions instantly.</p>
                  </div>
                )}

                {!transactions.length && selectedUploadId && (
                  <div className="text-center py-16 text-zinc-700">
                    <p className="text-lg">No transactions found for this document.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="text-zinc-500">Loading…</div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}

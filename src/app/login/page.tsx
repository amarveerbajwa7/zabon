'use client'

export const dynamic = 'force-dynamic'

import { useState, FormEvent, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

type Tab = 'signin' | 'signup'
type MagicState = 'idle' | 'sent' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [magicState, setMagicState] = useState<MagicState>('idle')

  const supabase = useMemo(() => createBrowserClient(), [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Enter your email first')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) throw error
      setMagicState('sent')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
      setMagicState('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">
            z<span style={{ color: '#D4883A' }}>a</span>
            <span style={{ color: '#2BAE8E' }}>b</span>on
          </span>
          <p className="text-zinc-500 text-sm mt-1">AI Bookkeeper</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
          {/* Tab switcher */}
          <div className="flex bg-zinc-800 rounded-lg p-1 gap-1">
            {(['signin', 'signup'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setMagicState('idle') }}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  tab === t
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {magicState === 'sent' ? (
            <div className="text-center py-4 space-y-2">
              <div className="text-2xl">✉️</div>
              <p className="text-emerald-400 text-sm font-medium">Magic link sent!</p>
              <p className="text-zinc-500 text-xs">Check your inbox at {email}</p>
              <button
                onClick={() => setMagicState('idle')}
                className="text-zinc-400 text-xs underline mt-2"
              >
                Use password instead
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 text-sm font-semibold text-black rounded-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#D4883A' }}
              >
                {loading ? '…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs">or</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              {/* Magic link */}
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full py-2.5 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg transition-colors hover:bg-zinc-700 disabled:opacity-50"
              >
                Email me a sign-in link
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

import Link from 'next/link'

const Logo = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const cls =
    size === 'lg'
      ? 'text-5xl font-black tracking-tight'
      : size === 'sm'
      ? 'text-xl font-black tracking-tight'
      : 'text-3xl font-black tracking-tight'
  return (
    <span className={cls}>
      z<span style={{ color: '#D4883A' }}>a</span>
      <span style={{ color: '#2BAE8E' }}>b</span>on
    </span>
  )
}

const steps = [
  {
    num: '01',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
    title: 'Upload your statement',
    desc: 'Drop in your RBC or other bank CSV. No formatting required — ZABON handles the parsing.',
  },
  {
    num: '02',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: 'AI categorizes everything',
    desc: 'Every transaction gets a QuickBooks category and a confidence score. High-confidence items are ready to push instantly.',
  },
  {
    num: '03',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Review, approve, and push',
    desc: 'Spot-check anything flagged for review. Approve in bulk. Push to QuickBooks in one click.',
  },
]

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    title: 'AI Categorization',
    desc: 'Transactions are matched to QuickBooks Chart of Accounts categories using fine-tuned models. Not keyword rules — actual intelligence.',
    accent: '#D4883A',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'RBC Format Support',
    desc: 'Native support for RBC bank statement exports. More Canadian banks coming soon.',
    accent: '#2BAE8E',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    ),
    title: 'QuickBooks Sync',
    desc: 'Direct OAuth integration with QuickBooks Online. Push approved transactions as journal entries — no copy-paste, no CSV imports.',
    accent: '#D4883A',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
    title: 'One-Click Bulk Review',
    desc: 'Approve or reject entire batches at once. Flag individual transactions for closer review. Your workflow, your pace.',
    accent: '#2BAE8E',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    title: 'Confidence Scores',
    desc: "Every categorization comes with a confidence score. High confidence means it's ready. Low confidence means ZABON flags it for your eyes.",
    accent: '#D4883A',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: 'Full Audit Trail',
    desc: 'Every decision — AI or human — is logged. Know exactly what was categorized, changed, approved, and when.',
    accent: '#2BAE8E',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0A0A0A' }}>

      {/* NAV */}
      <nav className="sticky top-0 z-30 border-b border-white/5 backdrop-blur-md" style={{ backgroundColor: 'rgba(10,10,10,0.85)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-black transition-all hover:brightness-110 active:scale-95"
            style={{ backgroundColor: '#D4883A' }}
          >
            Get Started →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border"
          style={{ borderColor: '#2BAE8E44', color: '#2BAE8E', backgroundColor: '#2BAE8E11' }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#2BAE8E' }} />
          Free while in beta
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-none mb-6">
          Your books,{' '}
          <span
            className="relative inline-block"
            style={{
              background: 'linear-gradient(90deg, #D4883A, #2BAE8E)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            done by AI.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Upload a bank statement. ZABON reads it, categorizes every transaction, and pushes clean data to QuickBooks —&nbsp;in minutes, not hours.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl text-base font-bold text-black transition-all hover:brightness-110 active:scale-95 shadow-lg"
            style={{ backgroundColor: '#D4883A', boxShadow: '0 0 32px #D4883A44' }}
          >
            Start for free →
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-3.5 rounded-xl text-base font-semibold text-zinc-300 border border-white/10 hover:border-white/20 hover:text-white transition-all"
          >
            See how it works
          </a>
        </div>

        {/* Hero visual */}
        <div className="mt-20 relative">
          <div
            className="absolute inset-0 rounded-2xl blur-3xl opacity-20"
            style={{ background: 'linear-gradient(135deg, #D4883A, #2BAE8E)' }}
          />
          <div className="relative rounded-2xl border border-white/10 overflow-hidden" style={{ backgroundColor: '#111111' }}>
            {/* Mock terminal / dashboard preview */}
            <div className="border-b border-white/5 px-5 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-zinc-600 font-mono">zabon — dashboard</span>
            </div>
            <div className="p-6 overflow-x-auto">
              <div className="min-w-[520px]">
                {/* Mock stats row */}
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[
                    { label: 'Transactions', val: '247', color: '#fff' },
                    { label: 'Awaiting Review', val: '12', color: '#D4883A' },
                    { label: 'Approved', val: '235', color: '#2BAE8E' },
                    { label: 'Total Expenses', val: '$48,210', color: '#D4883A' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl border border-white/5 p-4" style={{ backgroundColor: '#1a1a1a' }}>
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.val}</div>
                      <div className="text-xs text-zinc-600 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Mock transaction rows */}
                <div className="rounded-xl border border-white/5 overflow-hidden" style={{ backgroundColor: '#161616' }}>
                  <div className="grid grid-cols-5 px-4 py-2 border-b border-white/5 text-xs text-zinc-600 font-semibold uppercase tracking-wider">
                    <span>Date</span><span>Description</span><span>Amount</span><span>Category</span><span>Status</span>
                  </div>
                  {[
                    { date: 'Nov 24', desc: 'AWS Canada', amt: '-$312.00', cat: 'Cloud Infrastructure', status: 'approved', conf: 98 },
                    { date: 'Nov 23', desc: 'Shopify Monthly', amt: '-$79.00', cat: 'Software & SaaS', status: 'approved', conf: 97 },
                    { date: 'Nov 22', desc: 'TTC Transit Pass', amt: '-$156.00', cat: 'Travel & Transit', status: 'approved', conf: 94 },
                    { date: 'Nov 21', desc: 'Restaurant 420 King', amt: '-$87.50', cat: 'Meals & Entertainment', status: 'review', conf: 61 },
                    { date: 'Nov 20', desc: 'Unknown Vendor 884', amt: '-$2,400.00', cat: 'Uncategorized', status: 'review', conf: 23 },
                  ].map((tx, i) => (
                    <div key={i} className="grid grid-cols-5 px-4 py-2.5 border-b border-white/[0.03] text-xs items-center hover:bg-white/[0.02]">
                      <span className="text-zinc-500">{tx.date}</span>
                      <span className="text-zinc-300 truncate pr-2">{tx.desc}</span>
                      <span className="text-zinc-200 font-mono">{tx.amt}</span>
                      <span className="text-zinc-400 truncate pr-2">{tx.cat}</span>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                        style={
                          tx.status === 'approved'
                            ? { backgroundColor: '#2BAE8E22', color: '#2BAE8E' }
                            : { backgroundColor: '#D4883A22', color: '#D4883A' }
                        }
                      >
                        {tx.status === 'approved' ? `✓ ${tx.conf}%` : `⚠ ${tx.conf}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#2BAE8E' }}>How it works</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Three steps. Done.</h2>
          <p className="text-zinc-500 mt-3 max-w-xl mx-auto">No setup fees. No onboarding calls. No learning curve. Just upload and go.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={i}
              className="relative rounded-2xl border border-white/5 p-8 flex flex-col gap-4 group hover:border-white/10 transition-all"
              style={{ backgroundColor: '#111111' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: i % 2 === 0 ? '#D4883A22' : '#2BAE8E22', color: i % 2 === 0 ? '#D4883A' : '#2BAE8E' }}
              >
                {step.icon}
              </div>
              <div className="text-xs font-mono text-zinc-700 absolute top-8 right-8">{step.num}</div>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 text-zinc-700 text-xl z-10">→</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#D4883A' }}>Features</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Built for the work, not the demo</h2>
          <p className="text-zinc-500 mt-3 max-w-xl mx-auto">Every feature exists because a real accountant needed it. No bloat.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/5 p-6 flex flex-col gap-4 hover:border-white/10 transition-all group"
              style={{ backgroundColor: '#111111' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-all"
                style={{ backgroundColor: `${f.accent}22`, color: f.accent }}
              >
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold mb-1.5">{f.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SOCIAL PROOF / BUILT FOR */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div
          className="rounded-2xl border border-white/5 p-10 md:p-14 text-center relative overflow-hidden"
          style={{ backgroundColor: '#111111' }}
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{ background: 'radial-gradient(ellipse at top left, #2BAE8E, transparent 60%), radial-gradient(ellipse at bottom right, #D4883A, transparent 60%)' }}
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#2BAE8E' }}>Built for</p>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Canadian accountants<br />and their clients</h2>
            <p className="text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Most bookkeeping tools are built for the US market and retrofitted for Canada. ZABON is built from day one for Canadian banks, Canadian tax categories, and Canadian workflows.
            </p>
            <div className="mt-10 grid sm:grid-cols-3 gap-6 text-center">
              {[
                { stat: 'RBC native', desc: 'First bank supported, more coming' },
                { stat: 'QBO sync', desc: 'Direct QuickBooks Online integration' },
                { stat: 'CAD first', desc: 'Canadian tax categories out of the box' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="text-2xl font-black mb-1" style={{ color: i % 2 === 0 ? '#D4883A' : '#2BAE8E' }}>{item.stat}</div>
                  <div className="text-zinc-500 text-sm">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#D4883A' }}>Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Free while in beta.</h2>
          <p className="text-zinc-500 mt-3 max-w-md mx-auto">We're in active development. Early users get full access at no cost while we build.</p>
        </div>

        <div className="max-w-sm mx-auto">
          <div
            className="rounded-2xl border p-8 relative overflow-hidden"
            style={{ backgroundColor: '#111111', borderColor: '#D4883A55' }}
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{ background: 'radial-gradient(ellipse at top right, #D4883A, transparent 60%)' }}
            />
            <div className="relative">
              <div
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-6"
                style={{ backgroundColor: '#D4883A22', color: '#D4883A' }}
              >
                Beta Access
              </div>
              <div className="flex items-end gap-1 mb-2">
                <span className="text-6xl font-black">$0</span>
                <span className="text-zinc-500 mb-2 text-sm">/ month</span>
              </div>
              <p className="text-zinc-500 text-sm mb-8">QuickBooks Online subscription required for sync. Everything else is free.</p>
              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited statement uploads',
                  'AI categorization on every transaction',
                  'QuickBooks Online sync',
                  'Confidence scoring & review workflow',
                  'Full audit trail',
                  'RBC format support',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]" style={{ backgroundColor: '#2BAE8E22', color: '#2BAE8E' }}>✓</span>
                    <span className="text-zinc-300">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard"
                className="block w-full text-center py-3.5 rounded-xl font-bold text-black transition-all hover:brightness-110 active:scale-95"
                style={{ backgroundColor: '#D4883A' }}
              >
                Get started free →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div
          className="rounded-2xl p-12 md:p-20 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #D4883A18, #2BAE8E18)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Stop manually categorizing.<br />Start reviewing.
          </h2>
          <p className="text-zinc-400 text-lg mb-8 max-w-lg mx-auto">
            Upload your first statement in 60 seconds. No credit card required.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-10 py-4 rounded-xl text-base font-bold text-black transition-all hover:brightness-110 active:scale-95 shadow-xl"
            style={{ backgroundColor: '#D4883A', boxShadow: '0 0 40px #D4883A44' }}
          >
            Try ZABON free →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-zinc-600 text-sm">Intelligent bookkeeping. Effortlessly balanced.</p>
          <p className="text-zinc-700 text-sm">© 2026 zabon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

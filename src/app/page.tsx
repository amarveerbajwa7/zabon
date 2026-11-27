import Link from 'next/link'

const FEATURES = [
  {
    icon: '📂',
    title: 'Upload Any Statement',
    desc: 'Drag and drop RBC bank or credit card CSV exports. Transactions are parsed instantly, no manual formatting.',
  },
  {
    icon: '🤖',
    title: 'AI Categorization in Seconds',
    desc: 'GPT-4o reads every transaction description and assigns the right account — with a confidence score and reasoning.',
  },
  {
    icon: '✅',
    title: 'Accountant Reviews, Not Rubber-Stamps',
    desc: 'Nothing posts without approval. Override any category, reject anything suspicious, then push with one click.',
  },
  {
    icon: '📊',
    title: 'Pushes Directly to QuickBooks',
    desc: 'Approved transactions flow into QuickBooks Online as properly categorized expenses. Zero copy-paste.',
  },
]

const ACCOUNTS = [
  'Advertising & Marketing', 'Bank Charges & Fees', 'Insurance',
  'Meals & Entertainment', 'Office Supplies', 'Payroll & Wages',
  'Professional Fees', 'Rent & Utilities', 'Software & Subscriptions', 'Travel',
]

const STEPS = [
  { step: '01', title: 'Export your statement', body: 'Download your RBC bank or credit card statement as a CSV file from online banking.' },
  { step: '02', title: 'Upload to ZABON', body: 'Drag the file into ZABON. AI reads every transaction and suggests a category from your chart of accounts.' },
  { step: '03', title: 'Review in 60 seconds', body: 'Scan the AI suggestions. Correct anything that looks off. Approve the batch.' },
  { step: '04', title: 'Push to QuickBooks', body: 'One click sends everything to QuickBooks Online. Books done.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">
            <span className="text-indigo-400">Z</span>ABON
          </span>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-medium rounded-lg transition-colors"
            >
              Get Started →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-800/60 bg-indigo-950/40 text-indigo-400 text-xs font-medium mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Powered by GPT-4o + QuickBooks Online
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
          Bookkeeping that takes{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            60 seconds
          </span>
          <br />not 6 hours.
        </h1>

        <p className="text-zinc-400 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload your bank statement. AI categorizes every transaction against your chart of accounts.
          You review, correct if needed, and push to QuickBooks with one click.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 font-semibold text-lg rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-900/50"
          >
            Start for free →
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold text-lg rounded-xl transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Social proof */}
        <p className="text-zinc-600 text-sm mt-8">No credit card required · Works with RBC · Syncs to QuickBooks Online</p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-zinc-800/60 py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How it works</h2>
            <p className="text-zinc-400 text-lg">Four steps from raw statement to clean books.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {STEPS.map(s => (
              <div key={s.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chart of accounts */}
      <section className="border-t border-zinc-800/60 py-24 bg-zinc-900/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Built-in chart of accounts</h2>
            <p className="text-zinc-400">AI categorizes against your real accounts — no custom setup needed.</p>
          </div>
          <div className="flex flex-wrap gap-3 justify-center max-w-3xl mx-auto">
            {ACCOUNTS.map(acc => (
              <span
                key={acc}
                className="px-4 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm"
              >
                {acc}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-800/60 py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Your accountant will{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              love you
            </span>{' '}
            for this.
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            Stop spending hours wrangling spreadsheets and manually entering transactions.
            ZABON does the grunt work so you can focus on what matters.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 font-semibold text-lg rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-900/50"
          >
            Try ZABON free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-zinc-600 text-sm">
          <span>
            <span className="text-indigo-400 font-bold">Z</span>ABON — AI Bookkeeper
          </span>
          <span>Built to ship, not to impress.</span>
        </div>
      </footer>
    </div>
  )
}

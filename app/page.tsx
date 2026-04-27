import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/pipeline')

  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-5 border-b border-gray-100">
        <span className="text-lg font-bold text-gray-900">Dealstash</span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign in</Link>
          <Link href="/signup" className="text-sm bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800">
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── SECTION 1: Hero ──────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-12 pb-10 md:pt-20 md:pb-16 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
          AI-Powered · Built for Small CRE Investment Teams
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5 md:mb-6">
          A broker sends you an OM.<br />
          It's scored and in your pipeline<br className="hidden sm:block" /> before you open your inbox.
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
          Dealstash is the AI-powered deal operating system for small CRE investment firms. From the first broker email to your full decision history — in one place.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup" className="bg-gray-900 text-white px-8 py-3 rounded-md text-sm font-semibold hover:bg-gray-800 transition-colors">
            Start free for 30 days
          </Link>
          <Link href="/demo" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-md text-sm font-semibold hover:border-gray-400 hover:text-gray-900 transition-colors">
            Try demo →
          </Link>
        </div>
        <p className="text-sm text-gray-400 mt-5">
          Built by a CRE investor, for CRE investment teams. No credit card required.
        </p>
      </div>

      {/* ── SECTION 2: Problem ───────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-white py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            The spreadsheet isn't your OS. It's your liability.
          </h2>
          <p className="text-gray-400 leading-relaxed text-base md:text-lg">
            When a deal gets killed, the reasoning disappears. When someone leaves the team, the institutional knowledge walks out with them. Six months later you can't remember why you passed, what you underwrote, or who owned it. Meanwhile your inbox has 47 unread OMs and no system to triage them. Dealstash fixes all of it.
          </p>
        </div>
      </div>

      {/* ── SECTION 3: Feature Grid ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-3">
          Everything your team needs. Nothing you don't.
        </h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'AI OM Parsing',
              desc: 'Drop in a broker PDF. AI reads it, extracts the deal details, scores it against your criteria, and creates it in your pipeline automatically. No manual data entry.',
            },
            {
              title: 'AI Deal Scoring',
              desc: 'Every deal gets scored the moment it enters your pipeline. Set your own criteria — location, returns, tenant quality, debt coverage — and get an instant go/no-go score.',
            },
            {
              title: 'Kanban Pipeline',
              desc: 'Drag deals through your stages. Every team member sees the same view in real time. No more "what stage is that Dallas deal in?"',
            },
            {
              title: 'Structured Kill Reasons',
              desc: 'When a deal dies, log exactly why. Over time this becomes your most valuable dataset — you\'ll never make the same mistake twice.',
            },
            {
              title: 'Decision Log',
              desc: 'Every stage move, kill, note, and file upload is timestamped and attributed automatically. Full audit trail, zero extra work.',
            },
            {
              title: 'Financial Snapshots',
              desc: 'Capture your underwriting assumptions at any point. New snapshot on every update — nothing gets overwritten, nothing gets lost.',
            },
            {
              title: 'AI Deal Import',
              desc: 'Already have deals in a spreadsheet? Upload your CSV and AI maps your columns to our schema automatically. Your full pipeline history, imported in minutes.',
            },
            {
              title: 'Contact & Relationship Tracking',
              desc: 'Know which brokers send your best deals. Link contacts to deals, track source quality, and build a relationship database your whole team can use.',
            },
            {
              title: 'Firm Deal Inbox',
              desc: 'Get a dedicated email address for your firm — brokers send OMs directly to it. AI parses and scores every deal automatically on arrival. Your pipeline builds itself.',
              comingSoon: true,
            },
          ].map(({ title, desc, comingSoon }) => (
            <div key={title} className="p-6 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                {comingSoon && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 4: Comparison Table ──────────────────────────────────────── */}
      <div className="border-t border-gray-100 py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              Finally, enterprise-grade AI at small firm pricing.
            </h2>
            <p className="text-gray-500">
              You shouldn't need a $50,000 platform to run a professional deal operation.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 pr-6 font-semibold text-gray-900 w-1/2">Feature</th>
                  <th className="py-3 px-4 font-semibold text-gray-500 text-center">Spreadsheets</th>
                  <th className="py-3 px-4 font-semibold text-gray-500 text-center">DealCloud</th>
                  <th className="py-3 px-4 font-bold text-gray-900 text-center rounded-t-lg bg-blue-50">Dealstash</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'AI OM parsing & scoring',         spreadsheets: false, dealcloud: false, dealstash: true },
                  { feature: 'Built for small teams',           spreadsheets: true,  dealcloud: false, dealstash: true },
                  { feature: 'Under $200/month',                spreadsheets: true,  dealcloud: false, dealstash: true },
                  { feature: 'Full decision history',           spreadsheets: false, dealcloud: true,  dealstash: true },
                  { feature: 'Setup in minutes',                spreadsheets: true,  dealcloud: false, dealstash: true },
                  { feature: 'No implementation fee',           spreadsheets: true,  dealcloud: false, dealstash: true },
                  { feature: 'Firm deal inbox with AI intake',  spreadsheets: false, dealcloud: false, dealstash: 'soon' },
                ].map(({ feature, spreadsheets, dealcloud, dealstash }, i) => (
                  <tr key={feature} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-3 pr-6 text-gray-700">{feature}</td>
                    <td className="py-3 px-4 text-center">
                      {spreadsheets
                        ? <span className="text-green-500 font-bold">✓</span>
                        : <span className="text-gray-300 font-bold">✗</span>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {dealcloud
                        ? <span className="text-green-500 font-bold">✓</span>
                        : <span className="text-gray-300 font-bold">✗</span>}
                    </td>
                    <td className="py-3 px-4 text-center bg-blue-50">
                      {dealstash === 'soon'
                        ? <span className="text-blue-500 text-xs font-medium">✓ coming soon</span>
                        : dealstash
                          ? <span className="text-green-500 font-bold">✓</span>
                          : <span className="text-gray-300 font-bold">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SECTION 5: Founder Note ──────────────────────────────────────────── */}
      <div className="border-t border-gray-100 py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="border-l-4 border-gray-200 pl-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Built from the inside.</h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              I spent three summers interning at CRE firms — property management, commercial development, and net lease underwriting. Every single one had the same problem. Deals tracked in spreadsheets, OMs buried in email threads, and institutional memory that walked out the door whenever someone left. I built Dealstash because I kept watching good firms lose good deals to bad systems. This is the tool I wish those firms had.
            </p>
            <p className="text-sm font-semibold text-gray-900">— Jack Morgan, Founder</p>
          </div>
        </div>
      </div>

      {/* ── SECTION 6: Positioning Statement ────────────────────────────────── */}
      <div className="bg-gray-900 text-white py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">
            Built for the firm enterprise software ignores.
          </h2>
          <p className="text-gray-400 leading-relaxed text-base md:text-lg mb-10">
            Enterprise CRE software is built for Blackstone. Dealstash is built for the 3–8 person investment team that closes real deals, moves fast, and doesn't have time to implement a $50,000 platform. Same AI capability. Built for your scale.
          </p>
          <Link href="/signup" className="inline-block bg-white text-gray-900 px-8 py-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors">
            Get started free →
          </Link>
        </div>
      </div>

      {/* ── SECTION 7: Pricing ───────────────────────────────────────────────── */}
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-14 md:py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Simple pricing. Serious software.</h2>
        <p className="text-gray-500 mb-10">One plan. Everything included. No surprises.</p>
        <div className="border border-gray-200 rounded-xl p-8 text-left">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-lg font-bold text-gray-900">Team</p>
              <p className="text-sm text-gray-500 mt-1">For small investment teams</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">$149<span className="text-lg font-normal text-gray-500">/mo</span></p>
              <p className="text-xs text-gray-400 mt-1">per firm</p>
            </div>
          </div>
          <ul className="space-y-3 mb-8">
            {[
              'Unlimited deals',
              'Unlimited team members',
              'AI OM parsing & scoring',
              'AI deal import with column mapping',
              'Full decision log & audit trail',
              'Financial snapshots',
              'Graveyard & kill reason analytics',
              'Contact & broker relationship tracking',
              'Deal scoring & underwriting checklist',
              'Weekly activity digest',
            ].map(item => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="text-green-500 font-bold">✓</span>
                {item}
              </li>
            ))}
            <li className="flex items-center gap-3 text-sm text-gray-500">
              <span className="text-blue-400 font-bold">✓</span>
              Firm deal inbox with AI intake <span className="ml-1 text-xs text-blue-500 font-medium">(coming soon)</span>
            </li>
          </ul>
          <Link href="/signup" className="block w-full bg-gray-900 text-white text-center py-3 rounded-md text-sm font-semibold hover:bg-gray-800 transition-colors">
            Start free for 30 days
          </Link>
          <p className="text-xs text-gray-400 text-center mt-3">No credit card required</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 md:px-8 py-6 text-center">
        <p className="text-xs text-gray-400 mb-2">© 2026 Dealstash. Built for investment teams.</p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600">Terms of Service</Link>
          <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600">Privacy Policy</Link>
        </div>
      </footer>

    </div>
  )
}

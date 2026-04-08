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

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-12 pb-10 md:pt-20 md:pb-16 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wide">
          Built for small CRE investment teams
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5 md:mb-6">
          Your deal pipeline.<br />Your decision history.
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed">
          Track deals, score opportunities, manage broker relationships — and never lose institutional memory again.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup" className="bg-gray-900 text-white px-8 py-3 rounded-md text-sm font-semibold hover:bg-gray-800 transition-colors">
            Start free for 30 days
          </Link>
          <Link href="/demo" className="border border-gray-300 text-gray-700 px-8 py-3 rounded-md text-sm font-semibold hover:border-gray-400 hover:text-gray-900 transition-colors">
            Try demo →
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          <Link href="/login" className="hover:underline">Already have an account?</Link>
        </p>
        <p className="text-sm text-gray-400 mt-4 font-medium">Built by a CRE investor, for CRE investment teams.</p>
        <p className="text-xs text-gray-400 mt-1">No credit card required. 30-day free trial.</p>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
          Everything your team needs. Nothing you don't.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Kanban Pipeline",
              desc: "Drag deals through your stages. Every team member sees the same view in real time."
            },
            {
              title: "Structured Kill Reasons",
              desc: "When a deal dies, log exactly why. Over time this becomes your most valuable dataset."
            },
            {
              title: "Decision Log",
              desc: "Every stage move, kill, note, and file upload is timestamped and attributed automatically."
            },
            {
              title: "Financial Snapshots",
              desc: "Capture your underwriting assumptions at any point. New snapshot each update — nothing gets overwritten."
            },
            {
              title: "OM Upload",
              desc: "Upload a PDF and create a deal in seconds. No manual data entry to get a deal into the pipeline."
            },
            {
              title: "Team Workspaces",
              desc: "Each deal has its own workspace — overview, risks, notes, files, and full history."
            },
            {
              title: "Contact & Relationship Tracking",
              desc: "Know which brokers send your best deals. Link contacts to deals, track sources, and build a relationship database your whole team can use."
            },
            {
              title: "Deal Scoring",
              desc: "Score every deal on your own criteria — location, tenant quality, debt coverage, and more. Get an instant go/no-go score out of 100."
            },
            {
              title: "Weekly Activity Digest",
              desc: "Get a weekly email summary of deal activity — what moved, what's stale, what needs attention. Stay on top of your pipeline without logging in."
            },
          ].map(({ title, desc }) => (
            <div key={title} className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The problem */}
      <div className="bg-gray-900 text-white py-12 md:py-16 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-6">The spreadsheet isn't your OS. It's your liability.</h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            When a deal gets killed, the reasoning disappears. When someone leaves the team,
            the institutional knowledge walks out with them. Six months later you can't remember
            why you passed, what you underwrote, or who owned it. Dealstash fixes that.
          </p>
          <Link href="/signup" className="inline-block bg-white text-gray-900 px-8 py-3 rounded-md text-sm font-semibold hover:bg-gray-100 transition-colors">
            Get started free →
          </Link>
        </div>
      </div>

      {/* Pricing */}
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12 md:py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Simple pricing</h2>
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
              'Full decision log & audit trail',
              'Financial snapshots',
              'OM upload intake',
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

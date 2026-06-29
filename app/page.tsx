import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const workflow = [
  {
    label: '01',
    title: 'Forward the OM',
    body: 'Brokers send deals to your firm inbox. Attachments, sender, and source context stay attached to the deal record.',
  },
  {
    label: '02',
    title: 'Review the intake',
    body: 'Dealstash extracts the core fields, applies your scoring criteria, and queues the deal before it enters active pursuit.',
  },
  {
    label: '03',
    title: 'Keep the decision',
    body: 'Stage moves, notes, files, financial snapshots, kill reasons, and contacts become a permanent operating record.',
  },
]

const memory = [
  'Why the team passed',
  'Broker and source history',
  'Score changes over time',
  'Underwriting snapshots',
  'Files, notes, and activity',
  'Markets and asset types reviewed',
]

const faqs = [
  {
    question: 'What happens when a broker sends an OM?',
    answer:
      'Your firm inbox receives the email, stores the source material, extracts the deal details, scores the opportunity, and places it into intake for review.',
  },
  {
    question: 'Is this a CRM?',
    answer:
      'No. Contacts matter, but the main object is the deal. Dealstash is built for intake, pipeline control, underwriting context, and decision history.',
  },
  {
    question: 'Can we import our spreadsheet?',
    answer:
      'Yes. CSV import helps move existing deals into the system so the current pipeline and old graveyard are not trapped in a static file.',
  },
  {
    question: 'Where do similar deals fit?',
    answer:
      'Dealstash captures the structured history that makes useful comparisons possible: market, asset type, source, score, stage history, notes, and kill reasons.',
  },
  {
    question: 'How is access controlled?',
    answer:
      'Users work inside an authenticated firm workspace. Deal data is scoped by firm, and the app uses protected routes plus database row-level security.',
  },
]

function Logo() {
  return (
    <span className="flex items-center gap-3 text-[20px] font-normal tracking-[-0.4px] text-white">
      dealstash
      <span className="flex items-center gap-1" aria-hidden="true">
        <span className="h-4 w-[2px] bg-white" />
        <span className="h-4 w-[2px] bg-white" />
        <span className="h-4 w-[2px] bg-white" />
      </span>
    </span>
  )
}

function ProductFrame() {
  return (
    <div className="rounded-[10px] border border-[#333333] bg-[#111111] p-3 shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px,rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]">
      <div className="rounded-[10px] bg-black p-4 md:p-5">
        <div className="mb-5 flex items-center justify-between border-b border-[#333333] pb-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">Intake</p>
            <h2 className="mt-1 text-[22px] font-medium leading-[1.2] tracking-[-0.44px] text-white">New broker deals</h2>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white">
            Needs review
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {[
              ['Austin industrial', 'NorthBridge Capital', '92'],
              ['Dallas multifamily', 'Walker & Co.', '84'],
              ['Phoenix retail pad', 'Canyon CRE', '61'],
            ].map(([deal, broker, score]) => (
              <div key={deal} className="rounded-[10px] border border-[#333333] bg-[#202020] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-medium tracking-[-0.3px] text-white">{deal}</p>
                    <p className="mt-1 text-[12px] font-light tracking-[-0.24px] text-[#999999]">{broker}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[22px] font-medium leading-none tracking-[-0.44px] text-white">{score}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#999999]">score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[10px] border border-[#333333] bg-[#202020] p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">Deal record</p>
            <dl className="mt-5 space-y-4">
              {[
                ['Source', 'broker email'],
                ['Files', 'OM, rent roll'],
                ['Stage', 'intake review'],
                ['Next step', 'assign owner'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-[#333333] pb-3 last:border-0 last:pb-0">
                  <dt className="text-[12px] font-light tracking-[-0.24px] text-[#999999]">{label}</dt>
                  <dd className="text-[13px] font-medium tracking-[-0.26px] text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">{children}</p>
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/pipeline')

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <nav className="sticky top-0 z-30 flex h-16 items-center justify-between bg-black/80 px-5 backdrop-blur md:px-8">
        <Link href="/" aria-label="Dealstash home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-[15px] font-medium tracking-[-0.3px] text-[#c0c0c0] transition hover:text-white sm:inline">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-full border border-white/50 px-6 py-3 text-[15px] font-medium tracking-[-0.3px] text-white transition hover:border-white hover:bg-white hover:text-black">
            Start free
          </Link>
        </div>
      </nav>

      <main>
        <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1280px] items-center gap-12 px-5 py-20 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionLabel>AI intake and deal memory for CRE teams</SectionLabel>
            <h1 className="mt-6 max-w-4xl text-[54px] font-medium leading-[0.98] tracking-[-2.7px] text-white sm:text-[72px] lg:text-[96px] lg:tracking-[-4.8px]">
              Stop losing the story behind each deal.
            </h1>
            <p className="mt-8 max-w-[600px] text-[18px] font-light leading-[1.4] tracking-[-0.36px] text-[#c0c0c0]">
              Dealstash gives small CRE investment teams one place for broker intake, pipeline movement, scoring, files, notes, and the reason each opportunity moved forward or died.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/signup" className="rounded-full bg-white px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-black shadow-[rgba(0,0,0,0.15)_0px_4px_20px_0px] transition hover:bg-[#f5f5f0]">
                Start free for 30 days
              </Link>
              <Link href="/demo" className="rounded-full border border-white/50 px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-white transition hover:border-white">
                Open demo
              </Link>
            </div>
            <p className="mt-5 text-[13px] font-light leading-[1.5] tracking-[-0.26px] text-[#999999]">
              $149/month per firm. No credit card required for trial.
            </p>
          </div>

          <ProductFrame />
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionLabel>Workflow</SectionLabel>
              <h2 className="mt-5 max-w-xl text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
                Built around the way deals actually arrive.
              </h2>
            </div>
            <div className="grid gap-3">
              {workflow.map((item) => (
                <article key={item.title} className="rounded-[10px] border border-[#333333] bg-[#202020] p-5">
                  <div className="grid gap-4 md:grid-cols-[80px_1fr]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">{item.label}</p>
                    <div>
                      <h3 className="text-[22px] font-medium leading-[1.2] tracking-[-0.44px] text-white">{item.title}</h3>
                      <p className="mt-3 max-w-2xl text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">{item.body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="rounded-[10px] bg-[#f5f5f0] p-6 text-black md:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#333333]">Operating memory</p>
                <h2 className="mt-5 max-w-2xl text-[42px] font-medium leading-[1.05] tracking-[-2.1px] md:text-[58px] md:tracking-[-2.9px]">
                  Similar-deal intelligence starts with clean history.
                </h2>
                <p className="mt-6 max-w-[560px] text-[17px] font-light leading-[1.45] tracking-[-0.34px] text-[#333333]">
                  The immediate value is control over today&apos;s pipeline. The compounding value is the record: what came in, who sent it, how it scored, what changed, and why the team passed or pursued.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {memory.map((item) => (
                  <div key={item} className="rounded-[10px] border border-black/10 bg-white/55 p-4">
                    <p className="text-[15px] font-medium leading-[1.4] tracking-[-0.3px] text-black">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['Firm inbox', 'A dedicated email address for inbound broker deals and OM attachments.'],
              ['Scoring', 'A consistent first-pass score based on the criteria your team defines.'],
              ['Decision log', 'A timestamped trail of stage changes, notes, files, snapshots, and kill reasons.'],
            ].map(([title, body]) => (
              <article key={title} className="rounded-[10px] border border-[#333333] bg-[#202020] p-5">
                <h3 className="text-[22px] font-medium leading-[1.2] tracking-[-0.44px] text-white">{title}</h3>
                <p className="mt-4 text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <SectionLabel>FAQ</SectionLabel>
              <h2 className="mt-5 text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
                Practical answers before you test it.
              </h2>
            </div>
            <div className="grid gap-3">
              {faqs.map((faq) => (
                <details key={faq.question} className="group rounded-[10px] border border-[#333333] bg-[#202020] p-5">
                  <summary className="cursor-pointer list-none text-[18px] font-medium leading-[1.4] tracking-[-0.36px] text-white">
                    <span className="flex items-center justify-between gap-4">
                      {faq.question}
                      <span className="text-[#999999] transition group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-4 text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="rounded-[10px] border border-[#333333] bg-[#202020] p-6 text-center md:p-12">
            <SectionLabel>Demo</SectionLabel>
            <h2 className="mx-auto mt-5 max-w-3xl text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
              Walk the product before you add live deals.
            </h2>
            <p className="mx-auto mt-6 max-w-[600px] text-[17px] font-light leading-[1.45] tracking-[-0.34px] text-[#c0c0c0]">
              Use the interactive demo to see intake, pipeline movement, deal detail pages, graveyard, and decision history without touching your firm data.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/demo" className="rounded-full bg-white px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-black shadow-[rgba(0,0,0,0.15)_0px_4px_20px_0px] transition hover:bg-[#f5f5f0]">
                Open interactive demo
              </Link>
              <Link href="/signup" className="rounded-full border border-white/50 px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-white transition hover:border-white">
                Start trial
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-10 text-center md:flex-row md:items-center md:justify-between md:px-8 md:text-left">
        <Logo />
        <div>
          <p className="text-[12px] font-light leading-[1.5] tracking-[0.36px] text-[#999999]">
            2026 Dealstash. Built for investment teams.
          </p>
          <div className="mt-2 flex items-center justify-center gap-4 md:justify-end">
            <Link href="/terms" className="text-[12px] text-[#999999] hover:text-white">Terms</Link>
            <Link href="/privacy" className="text-[12px] text-[#999999] hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

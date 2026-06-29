import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LandingAssistant } from '@/components/marketing/LandingAssistant'

const features = [
  {
    eyebrow: 'Intake',
    title: 'Broker email becomes structured memory.',
    body: 'Forward OMs into the firm inbox. Dealstash extracts the deal, files the source material, scores the opportunity, and queues it for review.',
  },
  {
    eyebrow: 'Pipeline',
    title: 'A clean operating rhythm for active deals.',
    body: 'Move deals through your real stages, assign owners, track stale opportunities, and keep every decision attached to the underlying asset.',
  },
  {
    eyebrow: 'Memory',
    title: 'Similar deals become a decision advantage.',
    body: 'Compare new opportunities against prior deals by market, broker, asset type, return profile, score, and why the team passed or pursued.',
  },
  {
    eyebrow: 'Scoring',
    title: 'Your buy box becomes executable.',
    body: 'Set firm-specific criteria once. Every new deal is scored against that standard so the team can triage quickly without losing nuance.',
  },
]

const faqs = [
  {
    question: 'How does the firm inbox work?',
    answer:
      'Each firm gets a dedicated intake address. Brokers send OMs there, and Dealstash parses attachments, creates the deal, stores the files, and scores the opportunity.',
  },
  {
    question: 'Is this replacing our CRM?',
    answer:
      'No. It is closer to an acquisition operating system: pipeline, intake, scoring, decision history, files, and deal memory. Contacts are included, but the core object is the deal.',
  },
  {
    question: 'What makes similar deals important?',
    answer:
      'CRE teams repeatedly see familiar markets, brokers, asset types, and risks. Similar-deal memory helps the team reuse judgment instead of relearning the same lesson six months later.',
  },
  {
    question: 'Can we import our existing pipeline?',
    answer:
      'Yes. CSV import maps your current spreadsheet fields into Dealstash so your old pipeline and graveyard become part of the operating memory.',
  },
  {
    question: 'Is deal data private?',
    answer:
      'Deal data is scoped to your authenticated firm workspace. The product is built around firm-level access, protected app routes, and row-level security in Supabase.',
  },
  {
    question: 'What happens after the trial?',
    answer:
      'The product is designed around simple firm pricing. During the trial, teams can test intake, scoring, the pipeline, contacts, and decision memory without a credit card.',
  },
]

function Logo() {
  return (
    <span className="flex items-center gap-3 text-[20px] font-normal tracking-[-0.4px] text-white">
      dealstash
      <span className="flex items-center gap-1">
        <span className="h-4 w-[2px] bg-white" />
        <span className="h-4 w-[2px] bg-white" />
        <span className="h-4 w-[2px] bg-white" />
      </span>
    </span>
  )
}

function ProductShot() {
  const rows = [
    ['Austin Industrial', '92', 'New', 'NorthBridge'],
    ['Dallas MF Refi', '84', 'Review', 'Walker & Co.'],
    ['Phoenix Retail', '61', 'Watch', 'Canyon CRE'],
  ]

  return (
    <div className="relative overflow-hidden rounded-[10px] bg-[#202020] p-[19px] shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px,rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">Product shot</p>
          <h3 className="mt-1 text-[22px] font-medium tracking-[-0.44px] text-white">Intake queue</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-black">
          3 new
        </span>
      </div>
      <div className="grid gap-3">
        {rows.map(([name, score, stage, broker]) => (
          <div key={name} className="rounded-[10px] border border-[#333333] bg-black p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-medium tracking-[-0.3px] text-white">{name}</p>
                <p className="mt-1 text-[12px] font-light tracking-[-0.24px] text-[#999999]">{broker}</p>
              </div>
              <div className="text-right">
                <p className="text-[22px] font-medium leading-none tracking-[-0.44px] text-white">{score}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#999999]">{stage}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-[10px] border border-[#333333] bg-[#111111] p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">AI extraction</p>
        <p className="mt-2 text-[14px] font-light leading-[1.5] tracking-[-0.28px] text-[#c0c0c0]">
          Parsed rent roll, offering memo, broker source, market, asset type, pricing guidance, and first-pass score.
        </p>
      </div>
    </div>
  )
}

function SimilarDealsShot() {
  return (
    <div className="relative overflow-hidden rounded-[10px] bg-[#f5f5f0] p-[19px] text-black shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px]">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#333333]">Operating memory</p>
      <h3 className="mt-3 max-w-lg text-[32px] font-medium leading-[1.1] tracking-[-1.6px]">
        Before you decide, see what this deal reminds the firm of.
      </h3>
      <div className="mt-8 grid gap-3">
        {[
          ['Similar killed deal', 'Same broker, same market, weaker DSCR. Passed for tenant rollover.'],
          ['Comparable winner', 'Same submarket and basis. Advanced after seller retrade.'],
          ['Pattern detected', 'Three prior deals from this source missed expense assumptions.'],
        ].map(([label, detail]) => (
          <div key={label} className="rounded-[10px] border border-black/10 bg-white/55 p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-black">{label}</p>
            <p className="mt-2 text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#333333]">{detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/pipeline')

  return (
    <div className="min-h-screen bg-black font-sans text-white">
      <nav className="sticky top-0 z-30 flex h-16 items-center justify-between bg-black/75 px-5 backdrop-blur">
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
        <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-[1280px] flex-col justify-center px-5 py-20 md:px-8">
          <div className="mx-auto max-w-6xl text-center">
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">
              AI deal operating system for small CRE teams
            </p>
            <h1 className="text-[58px] font-medium leading-[0.98] tracking-[-2.9px] text-white sm:text-[82px] lg:text-[128px] lg:tracking-[-6.4px]">
              The deal memory your firm never had.
            </h1>
            <p className="mx-auto mt-8 max-w-[620px] text-[18px] font-light leading-[1.4] tracking-[-0.36px] text-[#c0c0c0]">
              Broker emails become scored deals. Underwriting notes become searchable precedent. Every pass, pursue, source, and file becomes operating memory.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup" className="rounded-full bg-white px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-black shadow-[rgba(0,0,0,0.15)_0px_4px_20px_0px] transition hover:bg-[#f5f5f0]">
                Start free for 30 days →
              </Link>
              <Link href="/demo" className="rounded-full border border-white/50 px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-white transition hover:border-white">
                Try the demo
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <ProductShot />
            <LandingAssistant />
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
              A gallery for every decision your team makes.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="min-h-[330px] rounded-[10px] bg-[#202020] p-[19px] shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px,rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]"
              >
                <div className="flex h-full flex-col justify-between">
                  <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white">
                    {feature.eyebrow}
                  </span>
                  <div>
                    <h3 className="max-w-lg text-[32px] font-medium leading-[1.1] tracking-[-1.6px] text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">
                      {feature.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto grid max-w-[1280px] gap-4 px-5 py-24 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-center">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">
              Similar deals
            </p>
            <h2 className="text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
              The next deal should know the last one.
            </h2>
            <p className="mt-6 max-w-[560px] text-[18px] font-light leading-[1.4] tracking-[-0.36px] text-[#c0c0c0]">
              Dealstash turns your graveyard, notes, files, scores, broker history, and financial snapshots into a reference layer. New opportunities can be judged against what your firm has already seen.
            </p>
          </div>
          <SimilarDealsShot />
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="rounded-[10px] bg-[#202020] p-[19px] shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px,rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]">
            <div className="aspect-video rounded-[10px] border border-[#333333] bg-black p-6 md:p-10">
              <div className="flex h-full flex-col items-center justify-center text-center">
                <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[22px] text-black">
                  ▶
                </span>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">Demo video</p>
                <h2 className="mt-4 max-w-3xl text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
                  Watch an OM become a scored deal.
                </h2>
                <p className="mt-5 max-w-[560px] text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">
                  Placeholder for a Loom, Vimeo, or YouTube walkthrough. Until the final recording is ready, the live demo gives visitors the same product path.
                </p>
                <Link href="/demo" className="mt-8 rounded-full border border-white/50 px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-white transition hover:border-white">
                  Open interactive demo
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">FAQ</p>
              <h2 className="text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
                Questions before the first forward.
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
                  <p className="mt-4 text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="rounded-[10px] bg-[#f5f5f0] px-6 py-16 text-center text-black md:px-12 md:py-24">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#333333]">
              One plan, full workflow
            </p>
            <h2 className="mx-auto max-w-4xl text-[42px] font-medium leading-[1.05] tracking-[-2.1px] md:text-[58px] md:tracking-[-2.9px]">
              Built for the firm enterprise software ignores.
            </h2>
            <p className="mx-auto mt-6 max-w-[620px] text-[18px] font-light leading-[1.4] tracking-[-0.36px] text-[#333333]">
              $149 per month per firm. Unlimited deals, team members, AI intake, scoring, pipeline, contacts, graveyard, and decision history.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup" className="rounded-full bg-black px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-white shadow-[rgba(0,0,0,0.15)_0px_4px_20px_0px]">
                Start free →
              </Link>
              <Link href="/demo" className="rounded-full border border-black/50 px-6 py-4 text-[15px] font-medium tracking-[-0.3px] text-black">
                See demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-10 text-center md:flex-row md:items-center md:justify-between md:px-8 md:text-left">
        <Logo />
        <div>
          <p className="text-[12px] font-light leading-[1.5] tracking-[0.36px] text-[#999999]">
            © 2026 Dealstash. Built for investment teams.
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

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const workflow = [
  ['01', 'Forward the OM', 'Broker emails and attachments land in one firm inbox, not scattered across individual accounts.'],
  ['02', 'Review the intake', 'Dealstash extracts the core details, applies your scoring criteria, and queues the opportunity for a human decision.'],
  ['03', 'Move with context', 'Assign owners, advance stages, add notes, save files, and keep underwriting snapshots in the deal record.'],
  ['04', 'Remember the outcome', 'When a deal dies, the reason stays searchable with the source, score, market, asset type, and timeline.'],
]

const productSurfaces = [
  {
    label: 'Intake',
    title: 'Inbox to pipeline',
    body: 'A cleaner front door for broker flow. New deals arrive with source context, files, extracted fields, and a first-pass score.',
  },
  {
    label: 'Deal room',
    title: 'Underwriting context',
    body: 'Financial snapshots, notes, scoring, files, contacts, and activity live in one record instead of a chain of tabs and email replies.',
  },
  {
    label: 'Graveyard',
    title: 'Passed deals still work',
    body: 'Killed deals become institutional memory: why you passed, who sent it, what the numbers looked like, and what pattern repeated.',
  },
]

const memorySignals = [
  'Market and submarket',
  'Asset type and deal size',
  'Broker and source quality',
  'Score and criteria history',
  'Financial snapshots',
  'Notes and decision log',
  'Files and OM metadata',
  'Kill reasons and pass patterns',
]

const analystQuestions = [
  'Have we seen anything like this in Dallas before?',
  'Which brokers send deals we actually advance?',
  'What killed similar multifamily deals last year?',
  'Show me the risk pattern in low-scoring retail deals.',
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
    question: 'Where does the AI analyst fit?',
    answer:
      'The AI layer sits on top of firm memory: prior deals, notes, scores, files, sources, and outcomes. Its job is to answer questions about your deal history and surface relevant precedent.',
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">{children}</p>
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white">
      {children}
    </span>
  )
}

function HeroProductFrame() {
  return (
    <div className="rounded-[10px] border border-[#333333] bg-[#111111] p-3 shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px,rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]">
      <div className="rounded-[10px] bg-black p-4 md:p-5">
        <div className="mb-5 flex items-center justify-between border-b border-[#333333] pb-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">Operating memory</p>
            <h2 className="mt-1 text-[22px] font-medium leading-[1.2] tracking-[-0.44px] text-white">Austin industrial portfolio</h2>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-black">
            92 score
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            {[
              ['Source', 'NorthBridge Capital'],
              ['Stage', 'Intake review'],
              ['Files', 'OM, rent roll, photos'],
              ['Next step', 'Assign owner'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-[10px] border border-[#333333] bg-[#202020] px-4 py-3">
                <p className="text-[12px] font-light tracking-[-0.24px] text-[#999999]">{label}</p>
                <p className="text-right text-[13px] font-medium tracking-[-0.26px] text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-[10px] border border-[#333333] bg-[#202020] p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">AI analyst</p>
            <p className="mt-3 text-[18px] font-medium leading-[1.25] tracking-[-0.36px] text-white">
              Similar to 3 reviewed industrial deals.
            </p>
            <div className="mt-5 space-y-3">
              {[
                'Same broker sent two advanced deals in 2025.',
                'Prior pass reason: tenant rollover inside 18 months.',
                'Score is above current industrial average by 14 points.',
              ].map((item) => (
                <div key={item} className="rounded-[10px] border border-[#333333] bg-black p-3">
                  <p className="text-[13px] font-light leading-[1.45] tracking-[-0.26px] text-[#c0c0c0]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductSurfaceCard({ label, title, body }: { label: string; title: string; body: string }) {
  return (
    <article className="flex min-h-[340px] flex-col justify-between rounded-[10px] border border-[#333333] bg-[#202020] p-5 shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px,rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]">
      <div className="flex items-center justify-between">
        <Pill>{label}</Pill>
        <span className="text-[11px] font-light tracking-[-0.22px] text-[#999999]">Dealstash</span>
      </div>
      <div>
        <div className="mb-6 grid gap-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-10 rounded-[10px] border border-[#333333] bg-black" />
          ))}
        </div>
        <h3 className="text-[32px] font-medium leading-[1.05] tracking-[-1.6px] text-white">{title}</h3>
        <p className="mt-4 text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">{body}</p>
      </div>
    </article>
  )
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
        <section className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1280px] items-center gap-14 px-5 py-20 md:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionLabel>AI intake and operating memory for CRE teams</SectionLabel>
            <h1 className="mt-6 max-w-4xl text-[56px] font-medium leading-[0.96] tracking-[-2.8px] text-white sm:text-[78px] lg:text-[104px] lg:tracking-[-5.2px]">
              Every deal your firm sees, remembered.
            </h1>
            <p className="mt-8 max-w-[620px] text-[18px] font-light leading-[1.4] tracking-[-0.36px] text-[#c0c0c0]">
              Dealstash turns broker flow into structured deal memory: intake, scoring, files, notes, pipeline movement, kill reasons, and an AI analyst built around prior deals.
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

          <HeroProductFrame />
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <SectionLabel>Why it exists</SectionLabel>
            <h2 className="mt-5 text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
              The spreadsheet tracks rows. It does not remember judgment.
            </h2>
            <p className="mx-auto mt-6 max-w-[680px] text-[17px] font-light leading-[1.45] tracking-[-0.34px] text-[#c0c0c0]">
              Small CRE teams see hundreds of opportunities, pass on most of them, and then lose the reasoning in inboxes, folders, and old models. Dealstash keeps that reasoning attached to the firm.
            </p>
          </div>
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
              {workflow.map(([number, title, body]) => (
                <article key={title} className="rounded-[10px] border border-[#333333] bg-[#202020] p-5">
                  <div className="grid gap-4 md:grid-cols-[80px_1fr]">
                    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">{number}</p>
                    <div>
                      <h3 className="text-[22px] font-medium leading-[1.2] tracking-[-0.44px] text-white">{title}</h3>
                      <p className="mt-3 max-w-2xl text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">{body}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel>Product surfaces</SectionLabel>
              <h2 className="mt-5 max-w-2xl text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
                Screens that match the acquisition workflow.
              </h2>
            </div>
            <p className="max-w-[440px] text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">
              Product surfaces stay close to the workflow: intake, deal review, scoring, files, notes, contacts, and the graveyard of passed opportunities.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {productSurfaces.map((surface) => (
              <ProductSurfaceCard key={surface.title} {...surface} />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="rounded-[10px] bg-[#f5f5f0] p-6 text-black md:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#333333]">Similar deals</p>
                <h2 className="mt-5 max-w-2xl text-[42px] font-medium leading-[1.05] tracking-[-2.1px] md:text-[58px] md:tracking-[-2.9px]">
                  The AI layer is only useful if the memory is clean.
                </h2>
                <p className="mt-6 max-w-[580px] text-[17px] font-light leading-[1.45] tracking-[-0.34px] text-[#333333]">
                  Similar-deal search works when it is grounded in the actual record: what arrived, who sent it, how it scored, how the team underwrote it, and why it advanced or died.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {memorySignals.map((item) => (
                  <div key={item} className="rounded-[10px] border border-black/10 bg-white/60 p-4">
                    <p className="text-[15px] font-medium leading-[1.4] tracking-[-0.3px] text-black">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-24 md:px-8">
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[10px] border border-[#333333] bg-[#202020] p-6 md:p-8">
              <SectionLabel>AI analyst</SectionLabel>
              <h2 className="mt-5 text-[42px] font-medium leading-[1.05] tracking-[-2.1px] text-white md:text-[58px] md:tracking-[-2.9px]">
                A firm memory interface.
              </h2>
              <p className="mt-6 text-[17px] font-light leading-[1.45] tracking-[-0.34px] text-[#c0c0c0]">
                The chat surface is for deal questions: prior comps, broker patterns, pass reasons, market history, and risks hiding in the firm record.
              </p>
            </div>
            <div className="rounded-[10px] border border-[#333333] bg-black p-5">
              <div className="mb-5 flex items-center justify-between border-b border-[#333333] pb-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">Ask your deal memory</p>
                <Pill>AI analyst</Pill>
              </div>
              <div className="space-y-3">
                {analystQuestions.map((question) => (
                  <div key={question} className="rounded-full border border-[#333333] bg-[#202020] px-4 py-3">
                    <p className="text-[14px] font-light leading-[1.4] tracking-[-0.28px] text-[#c0c0c0]">{question}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-[10px] bg-[#f5f5f0] p-5 text-black">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#333333]">Expected answer</p>
                <p className="mt-3 text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#333333]">
                  Three similar deals were reviewed. Two were killed for tenant rollover. One advanced after a price reduction. The same broker sent all three.
                </p>
              </div>
            </div>
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

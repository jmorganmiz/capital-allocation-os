'use client'

import { useMemo, useState } from 'react'

const prompts = [
  'How does the inbox work?',
  'Show me similar deals',
  'What does the AI remember?',
  'Can I try it with my team?',
]

const answers: Record<string, string> = {
  'How does the inbox work?':
    'Your firm gets a dedicated deal inbox. Brokers forward OMs there, Dealstash parses the files, scores the deal against your buy box, and places it in Intake for review.',
  'Show me similar deals':
    'On each deal, the operating memory can surface prior deals with matching market, asset type, broker, size, return profile, and kill reasons so your team sees precedent before deciding.',
  'What does the AI remember?':
    'It remembers structured deal details, notes, score history, stage movement, financial snapshots, files, source quality, and why your team passed or advanced similar opportunities.',
  'Can I try it with my team?':
    'Yes. Start a 30-day trial, invite your team, forward a few OMs, and use the demo pipeline if you want to evaluate the workflow before importing live deals.',
}

export function LandingAssistant() {
  const [activePrompt, setActivePrompt] = useState(prompts[0])
  const [customQuestion, setCustomQuestion] = useState('')

  const response = useMemo(() => {
    const normalized = customQuestion.trim().toLowerCase()

    if (!normalized) return answers[activePrompt]
    if (normalized.includes('price') || normalized.includes('cost')) {
      return 'Dealstash is built around simple firm-level pricing: one workspace, your team, AI intake, scoring, pipeline, and decision memory without enterprise implementation fees.'
    }
    if (normalized.includes('security') || normalized.includes('private')) {
      return 'Deal data stays scoped to your firm workspace. Team access, authenticated app routes, and Supabase row-level security keep deal memory separated by firm.'
    }
    if (normalized.includes('demo') || normalized.includes('video')) {
      return 'Use the demo walkthrough to see the flow: broker email, AI intake, score, similar-deal memory, pipeline movement, and final decision log.'
    }

    return 'I can explain the inbox, AI scoring, similar-deal memory, team workflow, pricing, or demo path. For a live answer inside the app, the next step is connecting this assistant to your firm deal data.'
  }, [activePrompt, customQuestion])

  return (
    <div className="rounded-[10px] bg-[#202020] p-[19px] shadow-[rgba(0,0,0,0.35)_0px_10px_30px_0px,rgba(255,255,255,0.08)_0px_1px_0px_0px_inset]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#999999]">
            AI agent
          </p>
          <h3 className="mt-1 text-[22px] font-medium leading-[1.2] tracking-[-0.44px] text-white">
            Ask Dealstash
          </h3>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-white">
          Agent preview
        </span>
      </div>

      <div className="space-y-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => {
              setActivePrompt(prompt)
              setCustomQuestion('')
            }}
            className={`w-full rounded-full border px-4 py-3 text-left text-[14px] font-light leading-[1.4] tracking-[-0.28px] transition ${
              activePrompt === prompt && !customQuestion
                ? 'border-white bg-white text-black'
                : 'border-[#333333] bg-black text-[#c0c0c0] hover:border-white/50 hover:text-white'
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="sr-only">Ask a custom product question</span>
        <input
          value={customQuestion}
          onChange={(event) => setCustomQuestion(event.target.value)}
          placeholder="Ask about pricing, security, demo..."
          className="w-full rounded-full border border-[#333333] bg-black px-4 py-3 text-[14px] font-light tracking-[-0.28px] text-white outline-none placeholder:text-[#666666] focus:border-white/60"
        />
      </label>

      <div className="mt-5 rounded-[10px] border border-[#333333] bg-black p-5">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#999999]">
          Response
        </p>
        <p className="mt-3 text-[15px] font-light leading-[1.5] tracking-[-0.3px] text-[#c0c0c0]">
          {response}
        </p>
      </div>
    </div>
  )
}

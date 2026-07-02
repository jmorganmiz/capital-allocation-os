'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  label?: string
}

const STARTERS = [
  'Have we seen this broker before?',
  'Why do Dallas deals fail the buy box?',
  'Compare 4810 Gaston to similar deals',
  'Summarize this OM',
]

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function LandingAnalyst() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'demo-welcome',
      role: 'assistant',
      label: 'Demo mode',
      content: 'Ask me how Dealstash remembers deals. I use fictional sample data, so no private firm records are exposed here.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function ask(value: string) {
    const question = value.trim()
    if (!question || loading) return
    setInput('')
    setLoading(true)
    setMessages(previous => [...previous, { id: id(), role: 'user', content: question }])

    try {
      const response = await fetch('/api/demo-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'The demo analyst is unavailable.')
      setMessages(previous => [...previous, { id: id(), role: 'assistant', content: data.answer, label: data.label }])
    } catch (error) {
      setMessages(previous => [...previous, {
        id: id(),
        role: 'assistant',
        label: 'Try again',
        content: error instanceof Error ? error.message : 'The demo analyst is unavailable.',
      }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      ask(input)
    }
  }

  return (
    <div className="landing-analyst" data-open={open ? 'true' : 'false'}>
      {open && (
        <section className="landing-analyst-panel" aria-label="Dealstash demo analyst">
          <header>
            <div className="landing-analyst-mark">AI</div>
            <div>
              <span>Interactive product preview</span>
              <h2>Ask Dealstash</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close demo analyst">&times;</button>
          </header>

          <div className="landing-analyst-boundary">
            Fictional sample data only. Your firm data is available only after sign-in.
          </div>

          <div ref={scrollRef} className="landing-analyst-messages" aria-live="polite">
            {messages.map(message => (
              <div key={message.id} className="landing-analyst-message" data-role={message.role}>
                {message.label && <span>{message.label}</span>}
                <p>{message.content}</p>
              </div>
            ))}
            {loading && (
              <div className="landing-analyst-message" data-role="assistant">
                <span>Searching sample memory</span>
                <p>Connecting the deal history...</p>
              </div>
            )}
          </div>

          <div className="landing-analyst-prompts">
            {STARTERS.map(prompt => <button type="button" key={prompt} onClick={() => ask(prompt)} disabled={loading}>{prompt}</button>)}
          </div>

          <div className="landing-analyst-compose">
            <textarea
              ref={inputRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about brokers, buy boxes, OMs, or similar deals..."
              rows={2}
              maxLength={500}
            />
            <button type="button" onClick={() => ask(input)} disabled={loading || !input.trim()}>Ask</button>
          </div>

          <footer>
            <span>Ready to ask about your own deals?</span>
            <Link href="/signup">Start free &rarr;</Link>
          </footer>
        </section>
      )}

      <button
        type="button"
        className="landing-analyst-launcher"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-label={open ? 'Close demo analyst' : 'Open demo analyst'}
      >
        <span>AI</span>
        <strong>{open ? 'Close' : 'Ask Dealstash'}</strong>
      </button>
    </div>
  )
}

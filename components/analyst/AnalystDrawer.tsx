'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  'What needs attention in my pipeline?',
  'Why are deals getting killed?',
  'Have we seen this broker before?',
  'Summarize firm memory',
]

function formatMessage(content: string) {
  return content.split('\n').map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < content.split('\n').length - 1 && <br />}
    </span>
  ))
}

export default function AnalystDrawer() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Ask me about your firm memory: stale deals, killed deals, broker history, similar deals, or pipeline shape.',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  async function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setInput('')
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }])

    try {
      const res = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analyst failed.')
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error instanceof Error
            ? `I could not answer that yet: ${error.message}`
            : 'I could not answer that yet.',
        },
      ])
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
    <>
      <button
        className="app-analyst-launcher"
        onClick={() => setOpen(true)}
        aria-label="Open AI analyst"
      >
        <span>AI</span>
        <strong>Analyst</strong>
      </button>

      {open && (
        <div className="app-analyst-overlay" onClick={() => setOpen(false)}>
          <aside className="app-analyst-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="app-analyst-header">
              <div>
                <p>Firm memory</p>
                <h2>AI Analyst</h2>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close AI analyst">
                ×
              </button>
            </div>

            <div className="app-analyst-intro">
              <strong>Ask Dealstash what your team already knows.</strong>
              <span>Answers are scoped to this firm’s deals, graveyard, stages, scores, and source history.</span>
            </div>

            <div ref={scrollRef} className="app-analyst-messages">
              {messages.map((message, index) => (
                <div key={index} className="app-analyst-message" data-role={message.role}>
                  {formatMessage(message.content)}
                </div>
              ))}
              {loading && (
                <div className="app-analyst-message" data-role="assistant">
                  Thinking through firm memory...
                </div>
              )}
            </div>

            <div className="app-analyst-prompts">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button key={prompt} onClick={() => ask(prompt)} disabled={loading}>
                  {prompt}
                </button>
              ))}
            </div>

            <div className="app-analyst-compose">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about killed deals, stale deals, brokers, similar deals..."
                rows={3}
              />
              <button onClick={() => ask(input)} disabled={loading || !input.trim()}>
                Ask
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

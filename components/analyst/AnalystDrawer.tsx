'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  question?: string
  memoryCandidate?: string
  memoryReferences?: Array<{
    id: string
    content: string
    feedbackType: 'saved' | 'correction' | 'firm_rule'
  }>
  feedback?: 'helpful' | 'not_helpful' | 'saved' | 'firm_rule'
}

const SUGGESTED_PROMPTS = [
  'What needs attention in my pipeline?',
  'Why are deals getting killed?',
  'Have we seen this broker before?',
  'Summarize firm memory',
]

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function formatMessage(content: string) {
  const lines = content.split('\n')
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 && <br />}
    </span>
  ))
}

export default function AnalystDrawer() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [correctionId, setCorrectionId] = useState<string | null>(null)
  const [correction, setCorrection] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: makeId(),
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
    setMessages((prev) => [...prev, { id: makeId(), role: 'user', content: trimmed }])

    try {
      const res = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analyst failed.')
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: data.answer,
          question: trimmed,
          memoryCandidate: data.memoryCandidate,
          memoryReferences: data.memoryReferences ?? [],
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
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

  async function saveMemory(message: Message, feedbackType: 'helpful' | 'not_helpful' | 'saved' | 'firm_rule') {
    const content = feedbackType === 'not_helpful'
      ? `Analyst answer marked not helpful. Question: ${message.question ?? 'unknown'}. Answer: ${message.content}`
      : (message.memoryCandidate ?? message.content)

    setSavingId(message.id)
    try {
      const res = await fetch('/api/analyst/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: message.question,
          answer: message.content,
          content,
          feedbackType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save memory.')
      setMessages((prev) => prev.map((item) => item.id === message.id ? { ...item, feedback: feedbackType } : item))
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: 'assistant',
          content: error instanceof Error ? `Memory was not saved: ${error.message}` : 'Memory was not saved.',
        },
      ])
    } finally {
      setSavingId(null)
    }
  }

  async function saveCorrection(message: Message) {
    const content = correction.trim()
    if (!content) return

    setSavingId(message.id)
    try {
      const res = await fetch('/api/analyst/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: message.question,
          answer: message.content,
          content,
          feedbackType: 'correction',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save correction.')
      setMessages(prev => prev.map(item => item.id === message.id ? { ...item, feedback: 'saved' } : item))
      setCorrectionId(null)
      setCorrection('')
    } catch (error) {
      setMessages(prev => [...prev, {
        id: makeId(),
        role: 'assistant',
        content: error instanceof Error ? `Correction was not saved: ${error.message}` : 'Correction was not saved.',
      }])
    } finally {
      setSavingId(null)
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
              <span>Save useful answers as firm memory. Future analyst answers will use those learning loops.</span>
            </div>

            <div ref={scrollRef} className="app-analyst-messages">
              {messages.map((message) => (
                <div key={message.id} className="app-analyst-message-wrap" data-role={message.role}>
                  <div className="app-analyst-message" data-role={message.role}>
                    {formatMessage(message.content)}
                  </div>

                  {message.role === 'assistant' && (message.memoryReferences?.length ?? 0) > 0 && (
                    <div className="app-analyst-citations">
                      <strong>Used firm memory</strong>
                      {message.memoryReferences?.map(memory => (
                        <div key={memory.id}>
                          <span>{memory.feedbackType === 'firm_rule' ? 'Firm rule' : memory.feedbackType === 'correction' ? 'Correction' : 'Saved memory'}</span>
                          <p>{memory.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {message.role === 'assistant' && message.question && (
                    <>
                      <div className="app-analyst-feedback">
                        {message.feedback ? (
                          <span>
                            {message.feedback === 'firm_rule'
                              ? 'Saved as firm rule'
                              : message.feedback === 'saved'
                                ? 'Correction saved'
                                : 'Feedback saved'}
                          </span>
                        ) : (
                          <>
                            <button disabled={savingId === message.id} onClick={() => saveMemory(message, 'helpful')}>
                              Helpful
                            </button>
                            <button disabled={savingId === message.id} onClick={() => saveMemory(message, 'saved')}>
                              Remember
                            </button>
                            <button disabled={savingId === message.id} onClick={() => saveMemory(message, 'firm_rule')}>
                              Firm rule
                            </button>
                            <button disabled={savingId === message.id} onClick={() => { setCorrectionId(message.id); setCorrection('') }}>
                              Correct
                            </button>
                            <button disabled={savingId === message.id} onClick={() => saveMemory(message, 'not_helpful')}>
                              Not helpful
                            </button>
                          </>
                        )}
                      </div>
                      {correctionId === message.id && !message.feedback && (
                        <div className="app-analyst-correction">
                          <label htmlFor={`correction-${message.id}`}>What should Dealstash remember instead?</label>
                          <textarea
                            id={`correction-${message.id}`}
                            value={correction}
                            onChange={event => setCorrection(event.target.value)}
                            placeholder="Write the corrected fact or decision rule..."
                            rows={3}
                            autoFocus
                          />
                          <div>
                            <button onClick={() => { setCorrectionId(null); setCorrection('') }}>Cancel</button>
                            <button onClick={() => saveCorrection(message)} disabled={!correction.trim() || savingId === message.id}>Save correction</button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              {loading && (
                <div className="app-analyst-message-wrap" data-role="assistant">
                  <div className="app-analyst-message" data-role="assistant">
                    Thinking through firm memory...
                  </div>
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

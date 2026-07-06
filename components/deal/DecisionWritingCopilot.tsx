'use client'

import { useState, useTransition } from 'react'
import {
  generateDecisionDraft,
  markDecisionDraftInserted,
  type DecisionSection,
  type WritingEvidence,
  type WritingMode,
} from '@/lib/actions/writing-copilot'

const prompts = {
  overview: [
    ['opportunity', 'What is the opportunity?'],
    ['strategy', 'What is the value-creation strategy?'],
    ['fit', "Why does it fit the firm's mandate?"],
    ['conditions', 'What must be true for the thesis to work?'],
  ],
  risks: [
    ['principal', 'What are the principal risks?'],
    ['impact', 'How could they affect the investment?'],
    ['mitigants', 'What mitigants exist today?'],
    ['diligence', 'What still needs to be verified?'],
  ],
} as const

interface Props {
  dealId: string
  section: DecisionSection
  currentText: string
  onInsert: (text: string, draftId: string) => void
}

export default function DecisionWritingCopilot({ dealId, section, currentText, onInsert }: Props) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<WritingMode>('evidence')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [draftId, setDraftId] = useState('')
  const [evidence, setEvidence] = useState<WritingEvidence[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function generate() {
    setError('')
    startTransition(async () => {
      const result = await generateDecisionDraft({ dealId, section, mode, currentText, answers })
      if (result.error || !result.draft || !result.draftId) {
        setError(result.error ?? 'Could not create draft')
        return
      }
      setDraft(result.draft)
      setDraftId(result.draftId)
      setEvidence(result.evidence ?? [])
      setQuestions(result.missingQuestions ?? [])
      setWarnings(result.warnings ?? [])
    })
  }

  function insert() {
    if (!draft || !draftId) return
    const insertedText = currentText.trim() ? `${currentText.trim()}\n\n${draft}` : draft
    startTransition(async () => {
      const result = await markDecisionDraftInserted(draftId, insertedText)
      if (result.error) {
        setError(result.error)
        return
      }
      onInsert(insertedText, draftId)
      setOpen(false)
    })
  }

  return (
    <div className="app-writing-copilot">
      <button type="button" className="app-writing-trigger" onClick={() => setOpen(value => !value)}>
        {open ? 'Close writing help' : 'Help me write'}
      </button>
      {open && (
        <div className="app-writing-panel">
          <div className="app-writing-panel-head">
            <div>
              <p>Decision writing copilot</p>
              <h3>{section === 'overview' ? 'Build the investment thesis' : 'Frame the risk narrative'}</h3>
            </div>
            <div className="app-writing-modes" role="tablist" aria-label="Writing mode">
              <button type="button" data-active={mode === 'evidence'} onClick={() => setMode('evidence')}>Draft from evidence</button>
              <button type="button" data-active={mode === 'guided'} onClick={() => setMode('guided')}>Guided builder</button>
            </div>
          </div>

          {mode === 'guided' ? (
            <div className="app-writing-prompts">
              {prompts[section].map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <textarea rows={2} value={answers[key] ?? ''} onChange={event => setAnswers(current => ({ ...current, [key]: event.target.value }))} />
                </label>
              ))}
            </div>
          ) : (
            <div className="app-writing-grounded-note">
              <strong>Firm evidence only</strong>
              <span>Uses the deal record, latest financial snapshot, scoring, buy box, and completed underwriting. Missing facts become questions—not guesses.</span>
            </div>
          )}

          <div className="app-writing-action-row">
            <span>No text is changed until you insert the draft.</span>
            <button type="button" onClick={generate} disabled={pending}>{pending ? 'Building…' : mode === 'guided' ? 'Build draft' : 'Generate grounded draft'}</button>
          </div>
          {error && <p className="app-writing-error" role="alert">{error}</p>}

          {draft && (
            <div className="app-writing-result">
              <div className="app-writing-draft">
                <p>Proposed draft</p>
                <div>{draft}</div>
              </div>
              {evidence.length > 0 && (
                <div className="app-writing-evidence">
                  <p>Supporting facts</p>
                  {evidence.map(item => <span key={item.id}><b>{item.label}</b>{item.value}<small>{item.source}</small></span>)}
                </div>
              )}
              {(questions.length > 0 || warnings.length > 0) && (
                <div className="app-writing-gaps">
                  <p>Still verify</p>
                  {[...questions, ...warnings].map((item, index) => <span key={`${index}-${item}`}>{item}</span>)}
                </div>
              )}
              <div className="app-writing-action-row final">
                <span>{currentText.trim() ? 'This will append below your existing text.' : 'You can edit it in the field after insertion.'}</span>
                <button type="button" onClick={insert} disabled={pending}>{pending ? 'Inserting…' : currentText.trim() ? 'Append draft' : 'Insert draft'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

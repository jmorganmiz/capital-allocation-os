'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import Link from 'next/link'
import { DEMO_STAGES, DEMO_KILL_REASONS } from '@/lib/demo-data'

type DemoStage = typeof DEMO_STAGES[number]
type DemoDeal = {
  id: string
  title: string
  market: string | null
  deal_type: string | null
  source_name: string | null
  stage_id: string | null
  owner: { full_name: string | null } | null
  latest_stage_event_at: string | null
}

function timeInStage(sinceDate: string | null | undefined): string {
  if (!sinceDate) return ''
  const days = Math.floor((Date.now() - new Date(sinceDate).getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return '1d'
  if (days < 30) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks}w`
  return `${Math.floor(days / 30)}mo`
}

function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

// ── Demo Deal Card ────────────────────────────────────────────────
function DemoDealCard({
  deal,
  stage,
  onKill,
}: {
  deal: DemoDeal
  stage: DemoStage
  onKill: (deal: DemoDeal) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal, fromStageId: stage.id },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-gray-200 rounded-lg p-3 cursor-grab active:cursor-grabbing
                  shadow-sm hover:shadow-md transition-shadow select-none
                  ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/demo/deals/${deal.id}`}
          onClick={e => e.stopPropagation()}
          className="text-sm font-medium text-gray-900 hover:text-blue-700 leading-snug"
        >
          {deal.title}
        </Link>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onKill(deal) }}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-xs mt-0.5"
          title="Kill deal"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {deal.market && (
            <span className="text-xs text-gray-400">{deal.market}</span>
          )}
          {deal.deal_type && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
              {deal.deal_type}
            </span>
          )}
          {deal.source_name && (
            <span className="text-xs text-gray-400">· {deal.source_name}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {deal.latest_stage_event_at && (
            <span className="text-xs text-amber-500 font-medium">
              {timeInStage(deal.latest_stage_event_at)}
            </span>
          )}
          {deal.owner && (
            <div
              className="w-5 h-5 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center font-medium"
              title={deal.owner.full_name ?? ''}
            >
              {initials(deal.owner.full_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Demo Column ────────────────────────────────────────────────────
function DemoColumn({
  stage,
  deals,
  onKill,
}: {
  stage: DemoStage
  deals: DemoDeal[]
  onKill: (deal: DemoDeal) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const isTerminal = stage.name === 'Closed'

  return (
    <div className="flex-shrink-0 w-[85vw] md:w-64 snap-start">
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${isTerminal ? 'text-green-600' : 'text-gray-500'}`}>
          {stage.name}
        </h3>
        <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
          {deals.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-24 rounded-lg transition-colors space-y-2 p-1
          ${isOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50'}`}
      >
        {deals.length === 0 ? (
          <div className="text-xs text-gray-300 text-center py-6">Drop deals here</div>
        ) : (
          deals.map(deal => (
            <DemoDealCard key={deal.id} deal={deal} stage={stage} onKill={onKill} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Sign-up Nudge Modal ────────────────────────────────────────────
function SignupNudge({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl text-center">
        <div className="text-2xl mb-3">🔒</div>
        <h2 className="text-base font-semibold text-gray-900 mb-2">Sign up to use this</h2>
        <p className="text-sm text-gray-500 mb-5">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="btn-ghost text-sm">
            Keep exploring
          </button>
          <Link
            href="/signup"
            className="bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-md hover:bg-gray-800"
          >
            Sign up free →
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main Demo Board ────────────────────────────────────────────────
interface Props {
  initialDeals: DemoDeal[]
  searchQuery?: string
}

export default function DemoKanbanBoard({ initialDeals, searchQuery = '' }: Props) {
  const [deals, setDeals] = useState<DemoDeal[]>(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }))

  const activeStages = DEMO_STAGES
  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  const q = searchQuery.trim().toLowerCase()
  const visibleDeals = q
    ? deals.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.market ?? '').toLowerCase().includes(q)
      )
    : deals

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const deal = deals.find(d => d.id === active.id)
    const newStageId = over.id as string
    if (!deal || deal.stage_id === newStageId) return

    // Local state only — no DB call
    setDeals(prev =>
      prev.map(d =>
        d.id === deal.id
          ? { ...d, stage_id: newStageId, latest_stage_event_at: new Date().toISOString() }
          : d
      )
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Hidden on mobile — nudge buttons aren't useful in demo on small screens */}
      <div className="hidden md:flex justify-end gap-2 px-6 pb-3">
        <button
          onClick={() => setNudgeMessage('Upload an OM PDF to instantly create a deal in your pipeline.')}
          className="btn-secondary"
        >
          Upload OM
        </button>
        <button
          onClick={() => setNudgeMessage('Create deals, assign owners, and move them through your custom pipeline stages.')}
          className="btn-primary"
        >
          + Add Deal
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={e => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 px-4 md:px-6 pb-6 overflow-x-auto flex-1 items-start snap-x snap-mandatory md:snap-none">
          {activeStages.map(stage => (
            <DemoColumn
              key={stage.id}
              stage={stage}
              deals={visibleDeals.filter(d => d.stage_id === stage.id)}
              onKill={() => setNudgeMessage('Kill a deal and log the reason why. Over time this becomes your most valuable dataset.')}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <DemoDealCard
              deal={activeDeal}
              stage={DEMO_STAGES.find(s => s.id === activeDeal.stage_id) ?? DEMO_STAGES[0]}
              onKill={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {nudgeMessage && (
        <SignupNudge message={nudgeMessage} onClose={() => setNudgeMessage(null)} />
      )}
    </div>
  )
}

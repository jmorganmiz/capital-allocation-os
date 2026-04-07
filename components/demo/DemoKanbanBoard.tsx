'use client'

import { useState, useMemo } from 'react'
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
import { FileText } from 'lucide-react'
import { DEMO_STAGES, DEMO_DEAL_NOTES, DEMO_CHECKLIST_ITEMS, DEMO_CHECKLIST_PROGRESS } from '@/lib/demo-data'
import ChecklistWarningModal from '@/components/pipeline/ChecklistWarningModal'

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
  onMove,
}: {
  deal: DemoDeal
  stage: DemoStage
  onKill: (deal: DemoDeal) => void
  onMove: (deal: DemoDeal) => void
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
      data-tour="deal-card"
      className={`bg-white border border-gray-200 rounded-lg p-3 md:cursor-grab md:active:cursor-grabbing
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
        {/* Kill button — desktop only */}
        <button
          data-tour="kill-btn"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onKill(deal) }}
          className="hidden md:block text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 text-xs mt-0.5"
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
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Notes indicator */}
          {(() => {
            const n = DEMO_DEAL_NOTES[deal.id]
            const hasNotes = !!(n?.overview || n?.risks || n?.notes)
            return hasNotes ? (
              <span title="Has notes" className="relative flex-shrink-0">
                <FileText size={14} strokeWidth={2} className="text-emerald-500" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
              </span>
            ) : (
              <span title="Add notes" className="flex-shrink-0">
                <FileText size={13} strokeWidth={1.5} className="text-gray-300" />
              </span>
            )
          })()}

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
          {/* Move button — mobile only */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMove(deal) }}
            className="md:hidden text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded px-2 py-0.5 font-medium"
          >
            Move
          </button>
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
  onMove,
}: {
  stage: DemoStage
  deals: DemoDeal[]
  onKill: (deal: DemoDeal) => void
  onMove: (deal: DemoDeal) => void
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
          <div className="text-xs text-gray-300 text-center py-6">
            <span className="hidden md:block">Drop deals here</span>
            <span className="md:hidden">No deals</span>
          </div>
        ) : (
          deals.map(deal => (
            <DemoDealCard key={deal.id} deal={deal} stage={stage} onKill={onKill} onMove={onMove} />
          ))
        )}
      </div>
    </div>
  )
}

// ── Move Sheet (bottom sheet on mobile) ───────────────────────────
function MoveSheet({
  deal,
  stages,
  onMove,
  onClose,
}: {
  deal: DemoDeal
  stages: DemoStage[]
  onMove: (stageId: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl shadow-2xl w-full max-w-lg mx-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-3 pt-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Move deal</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{deal.title}</p>
        </div>

        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {stages.map(stage => {
            const isCurrent = deal.stage_id === stage.id
            return (
              <button
                key={stage.id}
                disabled={isCurrent}
                onClick={() => { onMove(stage.id); onClose() }}
                className={`w-full text-left px-5 py-3.5 text-sm transition-colors
                  ${isCurrent
                    ? 'text-gray-400 bg-gray-50 cursor-default'
                    : 'text-gray-800 hover:bg-blue-50 active:bg-blue-100'
                  }`}
              >
                <span className={`font-medium ${stage.is_terminal ? 'text-green-600' : ''}`}>
                  {stage.name}
                </span>
                {isCurrent && (
                  <span className="ml-2 text-xs text-gray-400">current</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-gray-500 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sign-up Nudge Modal ────────────────────────────────────────────
function SignupNudge({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
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

interface PendingMove {
  deal: DemoDeal
  newStageId: string
  oldStageId: string
  incompleteItems: { id: string; name: string; position: number }[]
}

// ── Main Demo Board ────────────────────────────────────────────────
interface Props {
  initialDeals: DemoDeal[]
  searchQuery?: string
}

export default function DemoKanbanBoard({ initialDeals, searchQuery = '' }: Props) {
  const [deals, setDeals] = useState<DemoDeal[]>(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [moveTarget, setMoveTarget] = useState<DemoDeal | null>(null)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)
  const [showSaveNudge, setShowSaveNudge] = useState(false)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)

  // Build deal_id → Set<checklist_item_id> for fast incomplete lookups
  const progressMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const [dealId, completedIds] of Object.entries(DEMO_CHECKLIST_PROGRESS)) {
      m.set(dealId, new Set(completedIds))
    }
    return m
  }, [])

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

  function moveDeal(dealId: string, newStageId: string) {
    setDeals(prev =>
      prev.map(d =>
        d.id === dealId
          ? { ...d, stage_id: newStageId, latest_stage_event_at: new Date().toISOString() }
          : d
      )
    )
    setShowSaveNudge(true)
    setTimeout(() => setShowSaveNudge(false), 4000)
  }

  function checkAndMove(deal: DemoDeal, newStageId: string, oldStageId: string) {
    const stageItems = DEMO_CHECKLIST_ITEMS[oldStageId] ?? []
    const completed = progressMap.get(deal.id) ?? new Set<string>()
    const incomplete = stageItems.filter(i => !completed.has(i.id))
    if (incomplete.length > 0) {
      setPendingMove({ deal, newStageId, oldStageId, incompleteItems: incomplete })
    } else {
      moveDeal(deal.id, newStageId)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const deal = deals.find(d => d.id === active.id)
    const newStageId = over.id as string
    if (!deal || deal.stage_id === newStageId) return
    checkAndMove(deal, newStageId, deal.stage_id ?? '')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Hidden on mobile */}
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
        <div data-tour="board" className="flex gap-4 px-4 md:px-6 pb-6 overflow-x-auto flex-1 items-start snap-x snap-mandatory md:snap-none">
          {activeStages.map(stage => (
            <DemoColumn
              key={stage.id}
              stage={stage}
              deals={visibleDeals.filter(d => d.stage_id === stage.id)}
              onKill={() => setNudgeMessage('Kill a deal and log the reason why. Over time this becomes your most valuable dataset.')}
              onMove={deal => setMoveTarget(deal)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <DemoDealCard
              deal={activeDeal}
              stage={DEMO_STAGES.find(s => s.id === activeDeal.stage_id) ?? DEMO_STAGES[0]}
              onKill={() => {}}
              onMove={() => {}}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {moveTarget && (
        <MoveSheet
          deal={moveTarget}
          stages={activeStages}
          onMove={stageId => {
            setMoveTarget(null)
            checkAndMove(moveTarget, stageId, moveTarget.stage_id ?? '')
          }}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {pendingMove && (
        <ChecklistWarningModal
          dealTitle={pendingMove.deal.title}
          stageName={DEMO_STAGES.find(s => s.id === pendingMove.oldStageId)?.name ?? ''}
          incompleteItems={pendingMove.incompleteItems as any}
          onProceed={() => {
            moveDeal(pendingMove.deal.id, pendingMove.newStageId)
            setPendingMove(null)
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {nudgeMessage && (
        <SignupNudge message={nudgeMessage} onClose={() => setNudgeMessage(null)} />
      )}

      {/* Save nudge toast — shown briefly after a move */}
      {showSaveNudge && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
          <span className="text-gray-400">Changes won't be saved.</span>
          <Link href="/signup" className="text-blue-400 font-medium hover:text-blue-300">
            Sign up to save →
          </Link>
        </div>
      )}
    </div>
  )
}

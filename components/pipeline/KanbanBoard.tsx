'use client'

import { useState, useTransition, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Deal, DealStage, KillReason, StageChecklistItem } from '@/lib/types/database'
import { updateDealStage, killDeal } from '@/lib/actions/deals'
import DealColumn from './DealColumn'
import DealCard from './DealCard'
import KillModal from './KillModal'
import MoveSheet from './MoveSheet'
import CreateDealModal from './CreateDealModal'
import UploadOMModal from './UploadOMModal'
import ChecklistWarningModal from './ChecklistWarningModal'
import { showToast } from '@/lib/toast'

interface PendingMove {
  deal: Deal
  newStageId: string
  oldStageId: string
  incompleteItems: StageChecklistItem[]
}

interface Props {
  initialStages: DealStage[]
  initialDeals: (Deal & { owner?: { full_name: string | null } | null, latest_stage_event_at?: string | null })[]
  killReasons: KillReason[]
  currentUserId: string
  checklistItems: Pick<StageChecklistItem, 'id' | 'stage_id' | 'name' | 'position'>[]
  dealProgress: { deal_id: string; checklist_item_id: string }[]
}

export default function KanbanBoard({
  initialStages,
  initialDeals,
  killReasons,
  checklistItems,
  dealProgress,
}: Props) {
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [killTarget, setKillTarget] = useState<Deal | null>(null)
  const [moveTarget, setMoveTarget] = useState<Deal | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showUploadOM, setShowUploadOM] = useState(false)
  const [query, setQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }))

  const activeStages = initialStages.filter(s => s.name !== 'Killed')
  const activeStageIds = useMemo(() => new Set(activeStages.map(stage => stage.id)), [activeStages])
  const fallbackStageId = activeStages[0]?.id ?? null
  const displayStageId = (deal: Deal) => deal.stage_id && activeStageIds.has(deal.stage_id) ? deal.stage_id : fallbackStageId
  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null
  const owners = useMemo(() => {
    const unique = new Map<string, string>()
    deals.forEach(deal => {
      if (deal.owner_user_id && deal.owner?.full_name) unique.set(deal.owner_user_id, deal.owner.full_name)
    })
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [deals])
  const dealTypes = useMemo(() => [...new Set(deals.map(deal => deal.deal_type).filter(Boolean) as string[])].sort(), [deals])
  const visibleDeals = useMemo(() => {
    const term = query.trim().toLowerCase()
    return deals.filter(deal => {
      if (ownerFilter === 'unassigned' && deal.owner_user_id) return false
      if (ownerFilter && ownerFilter !== 'unassigned' && deal.owner_user_id !== ownerFilter) return false
      if (typeFilter && deal.deal_type !== typeFilter) return false
      if (term && ![deal.title, deal.market, deal.source_name].some(value => value?.toLowerCase().includes(term))) return false
      return true
    })
  }, [deals, ownerFilter, query, typeFilter])

  // Build deal_id → Set<checklist_item_id> for fast incomplete lookups
  const progressMap = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const p of dealProgress) {
      if (!m.has(p.deal_id)) m.set(p.deal_id, new Set())
      m.get(p.deal_id)!.add(p.checklist_item_id)
    }
    return m
  }, [dealProgress])

  function applyStageMove(dealId: string, newStageId: string, oldStageId: string) {
    setDeals(prev => prev.map(d =>
      d.id === dealId
        ? { ...d, stage_id: newStageId, latest_stage_event_at: new Date().toISOString() }
        : d
    ))
    startTransition(async () => {
      const result = await updateDealStage(dealId, newStageId, oldStageId)
      if (result.error) {
        setDeals(prev => prev.map(deal => deal.id === dealId ? { ...deal, stage_id: oldStageId } : deal))
        showToast(result.error, 'error')
      }
    })
  }

  // Check for incomplete checklist items; show warning or proceed immediately
  function checkAndMove(deal: Deal, newStageId: string, oldStageId: string) {
    const stageItems = checklistItems.filter(i => i.stage_id === oldStageId)
    const completed = progressMap.get(deal.id) ?? new Set<string>()
    const incomplete = stageItems.filter(i => !completed.has(i.id))

    if (incomplete.length > 0) {
      setPendingMove({ deal, newStageId, oldStageId, incompleteItems: incomplete as StageChecklistItem[] })
    } else {
      applyStageMove(deal.id, newStageId, oldStageId)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const deal = deals.find(d => d.id === active.id)
    const newStageId = over.id as string
    if (!deal || deal.stage_id === newStageId) return

    const newStage = initialStages.find(s => s.id === newStageId)
    if (newStage?.name === 'Killed') {
      setKillTarget(deal)
      return
    }

    checkAndMove(deal, newStageId, deal.stage_id ?? '')
  }

  function handleKillConfirm(killReasonId: string, notes: string) {
    if (!killTarget) return
    const killedStage = initialStages.find(s => s.name === 'Killed')
    if (!killedStage) return

    const target = killTarget
    setDeals(prev => prev.filter(d => d.id !== target.id))
    startTransition(async () => {
      const result = await killDeal(target.id, killReasonId, notes || null, target.stage_id ?? '', killedStage.id)
      if (result.error) {
        setDeals(prev => [target, ...prev])
        showToast(result.error, 'error')
      }
    })
    setKillTarget(null)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex flex-wrap gap-2">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search pipeline..." className="input-base w-full sm:w-48" />
          <select value={ownerFilter} onChange={event => setOwnerFilter(event.target.value)} className="input-base w-36">
            <option value="">All owners</option>
            <option value="unassigned">Unassigned</option>
            {owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} className="input-base w-36">
            <option value="">All asset types</option>
            {dealTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          {(query || ownerFilter || typeFilter) && (
            <button onClick={() => { setQuery(''); setOwnerFilter(''); setTypeFilter('') }} className="btn-ghost">Clear</button>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUploadOM(true)} className="btn-secondary">Upload OM</button>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ Add Deal</button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={e => setActiveId(e.active.id as string)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="flex gap-4 px-4 md:px-8 pb-6 overflow-x-auto flex-1 items-start snap-x snap-mandatory md:snap-none">
          {activeStages.map(stage => (
            <DealColumn
              key={stage.id}
              stage={stage}
              deals={visibleDeals.filter(d => displayStageId(d) === stage.id)}
              onKill={setKillTarget}
              onMove={setMoveTarget}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <DealCard
              deal={activeDeal}
              stage={initialStages.find(s => s.id === displayStageId(activeDeal)) ?? activeStages[0]}
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
          onMove={(newStageId, oldStageId) => {
            setMoveTarget(null)
            checkAndMove(moveTarget, newStageId, oldStageId)
          }}
          onClose={() => setMoveTarget(null)}
        />
      )}

      {killTarget && (
        <KillModal
          deal={killTarget}
          killReasons={killReasons}
          onConfirm={handleKillConfirm}
          onCancel={() => setKillTarget(null)}
        />
      )}

      {pendingMove && (
        <ChecklistWarningModal
          dealTitle={pendingMove.deal.title}
          stageName={initialStages.find(s => s.id === pendingMove.oldStageId)?.name ?? ''}
          incompleteItems={pendingMove.incompleteItems}
          onProceed={() => {
            applyStageMove(pendingMove.deal.id, pendingMove.newStageId, pendingMove.oldStageId)
            setPendingMove(null)
          }}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {showCreate && (
        <CreateDealModal
          stages={activeStages}
          onCreated={deal => {
            setDeals(prev => [{ ...deal, latest_stage_event_at: deal.created_at }, ...prev])
            setShowCreate(false)
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}
      {showUploadOM && (
        <UploadOMModal
          stages={activeStages}
          existingDeals={deals}
          onCreated={deal => {
            setDeals(prev => [{ ...deal, latest_stage_event_at: deal.created_at }, ...prev])
            setShowUploadOM(false)
          }}
          onCancel={() => setShowUploadOM(false)}
        />
      )}
    </div>
  )
}

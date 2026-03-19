'use client'

import { useState, useTransition } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { Deal, DealStage, KillReason } from '@/lib/types/database'
import { updateDealStage, killDeal } from '@/lib/actions/deals'
import DealColumn from './DealColumn'
import DealCard from './DealCard'
import KillModal from './KillModal'
import MoveSheet from './MoveSheet'
import CreateDealModal from './CreateDealModal'
import UploadOMModal from './UploadOMModal'

interface Props {
  initialStages: DealStage[]
  initialDeals: (Deal & { owner?: { full_name: string | null } | null, latest_stage_event_at?: string | null })[]
  killReasons: KillReason[]
  currentUserId: string
}

export default function KanbanBoard({ initialStages, initialDeals, killReasons, currentUserId }: Props) {
  const [deals, setDeals] = useState(initialDeals)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [killTarget, setKillTarget] = useState<Deal | null>(null)
  const [moveTarget, setMoveTarget] = useState<Deal | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showUploadOM, setShowUploadOM] = useState(false)
  const [isPending, startTransition] = useTransition()

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }))

  const activeStages = initialStages.filter(s => s.name !== 'Killed')
  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  function applyStageMove(dealId: string, newStageId: string, oldStageId: string) {
    setDeals(prev => prev.map(d =>
      d.id === dealId
        ? { ...d, stage_id: newStageId, latest_stage_event_at: new Date().toISOString() }
        : d
    ))
    startTransition(async () => { await updateDealStage(dealId, newStageId, oldStageId) })
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

    applyStageMove(deal.id, newStageId, deal.stage_id ?? '')
  }

  function handleKillConfirm(killReasonId: string, notes: string) {
    if (!killTarget) return
    const killedStage = initialStages.find(s => s.name === 'Killed')
    if (!killedStage) return

    setDeals(prev => prev.filter(d => d.id !== killTarget.id))
    startTransition(async () => { await killDeal(killTarget.id, killReasonId, notes || null, killTarget.stage_id ?? '', killedStage.id) })
    setKillTarget(null)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-end gap-2 px-4 md:px-6 pb-3">
        <button onClick={() => setShowUploadOM(true)} className="btn-secondary">
          Upload OM
        </button>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
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
            <DealColumn
              key={stage.id}
              stage={stage}
              deals={deals.filter(d => d.stage_id === stage.id)}
              onKill={setKillTarget}
              onMove={setMoveTarget}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal ? (
            <DealCard
              deal={activeDeal}
              stage={initialStages.find(s => s.id === activeDeal.stage_id)!}
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
          onMove={(newStageId, oldStageId) => applyStageMove(moveTarget.id, newStageId, oldStageId)}
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

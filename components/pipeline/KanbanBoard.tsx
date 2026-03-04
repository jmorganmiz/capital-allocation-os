'use client'

import { useState, useTransition } from 'react'
import { DealStage, Deal, KillReason } from '@/lib/types/database'
import { updateDealStage, killDeal, createDeal } from '@/lib/actions/deals'
import DealCard from './DealCard'
import KillModal from './KillModal'
import CreateDealModal from './CreateDealModal'

interface Props {
  stages: DealStage[]
  initialDeals: Deal[]
  killReasons: KillReason[]
}

export default function KanbanBoard({ stages, initialDeals, killReasons }: Props) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals)
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null)
  const [killTarget, setKillTarget] = useState<{ deal: Deal; killedStage: DealStage } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const killedStage = stages.find(s => s.name === 'Killed')
  const dealsByStage = (stageId: string) => deals.filter(d => d.stage_id === stageId)

  function handleDragStart(deal: Deal) {
    setDraggedDeal(deal)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent, targetStage: DealStage) {
    e.preventDefault()
    if (!draggedDeal) return
    if (draggedDeal.stage_id === targetStage.id) return

    if (targetStage.name === 'Killed') {
      setKillTarget({ deal: draggedDeal, killedStage: targetStage })
      setDraggedDeal(null)
      return
    }

    const fromStageId = draggedDeal.stage_id
    setDeals(prev =>
      prev.map(d => d.id === draggedDeal.id ? { ...d, stage_id: targetStage.id } : d)
    )

    startTransition(async () => {
      const result = await updateDealStage(draggedDeal.id, targetStage.id, fromStageId)
      if (result.error) {
        setDeals(prev =>
          prev.map(d => d.id === draggedDeal.id ? { ...d, stage_id: fromStageId } : d)
        )
      }
    })

    setDraggedDeal(null)
  }

  function handleKillConfirm(killReasonId: string, notes: string) {
    if (!killTarget) return
    const { deal, killedStage } = killTarget
    setDeals(prev => prev.filter(d => d.id !== deal.id))

    startTransition(async () => {
      const result = await killDeal(deal.id, killReasonId, notes || null, deal.stage_id, killedStage.id)
      if (result.error) {
        setDeals(prev => [...prev, deal])
      }
    })

    setKillTarget(null)
  }

  function handleDealCreated(newDeal: Deal) {
    setDeals(prev => [newDeal, ...prev])
    setShowCreateModal(false)
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          + Add Deal
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map(stage => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-64"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className={`flex items-center justify-between mb-2 px-1 ${
              stage.name === 'Killed' ? 'text-red-600' :
              stage.name === 'Closed' ? 'text-green-700' : 'text-gray-700'
            }`}>
              <span className="text-sm font-semibold uppercase tracking-wide">
                {stage.name}
              </span>
              <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                {dealsByStage(stage.id).length}
              </span>
            </div>

            <div className="space-y-2 min-h-[200px] bg-gray-50 rounded-lg p-2">
              {dealsByStage(stage.id).map(deal => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  onDragStart={() => handleDragStart(deal)}
                />
              ))}
              {dealsByStage(stage.id).length === 0 && (
                <div className="text-xs text-gray-400 text-center py-8">
                  Drop deals here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {killTarget && (
        <KillModal
          deal={killTarget.deal}
          killReasons={killReasons}
          onConfirm={handleKillConfirm}
          onCancel={() => setKillTarget(null)}
        />
      )}

      {showCreateModal && (
        <CreateDealModal
          stages={stages}
          onCreated={handleDealCreated}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </>
  )
}

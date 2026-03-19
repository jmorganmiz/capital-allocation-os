'use client'

import { useDroppable } from '@dnd-kit/core'
import { Deal, DealStage } from '@/lib/types/database'
import DealCard from './DealCard'

interface Props {
  stage: DealStage
  deals: (Deal & { owner?: { full_name: string | null } | null, latest_stage_event_at?: string | null })[]
  onKill: (deal: Deal) => void
  onMove: (deal: Deal) => void
}

export default function DealColumn({ stage, deals, onKill, onMove }: Props) {
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
            <DealCard
              key={deal.id}
              deal={deal}
              stage={stage}
              onKill={onKill}
              onMove={onMove}
            />
          ))
        )}
      </div>
    </div>
  )
}

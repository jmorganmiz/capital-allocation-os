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
  const emptyCopy = stage.name === 'New'
    ? 'New deals land here'
    : stage.name === 'Screening'
    ? 'Ready for first pass'
    : stage.name === 'Closed'
    ? 'Won deals appear here'
    : 'Drag deals here'

  return (
    <div className="app-pipeline-column">
      <div className="app-pipeline-column-header">
        <h3 style={{ color: isTerminal ? '#4ade80' : 'var(--lead)' }}>
          {stage.name}
        </h3>
        <span>{deals.length}</span>
      </div>

      <div
        ref={setNodeRef}
        className="app-pipeline-column-body"
        style={{
          background: isOver ? 'rgba(82,102,235,0.08)' : 'rgba(30,30,42,0.64)',
          border: isOver
            ? '1px solid rgba(82,102,235,0.3)'
            : '1px solid rgba(112,112,125,0.16)',
          boxShadow: '0 18px 45px rgba(0,0,0,0.16)',
        }}
      >
        {deals.length === 0 ? (
          <div className="app-pipeline-empty-column">
            <span className="hidden md:block">{emptyCopy}</span>
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

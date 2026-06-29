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
    <div style={{ flexShrink: 0, minWidth: '260px', maxWidth: '280px', width: '260px' }}>
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: isTerminal ? '#4ade80' : 'var(--lead)',
        }}>
          {stage.name}
        </h3>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--lead)',
          background: 'rgba(112,112,125,0.1)',
          border: '1px solid rgba(112,112,125,0.15)',
          borderRadius: '999px',
          padding: '1px 7px',
        }}>
          {deals.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="min-h-24 rounded-lg transition-colors space-y-2 p-1.5"
        style={{
          background: isOver ? 'rgba(82,102,235,0.08)' : 'rgba(30,30,42,0.55)',
          border: isOver
            ? '1px solid rgba(82,102,235,0.3)'
            : '1px solid rgba(112,112,125,0.15)',
        }}
      >
        {deals.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--lead)', textAlign: 'center', padding: '24px 0' }}>
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

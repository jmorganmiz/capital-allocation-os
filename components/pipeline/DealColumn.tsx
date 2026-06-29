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
    <div className="flex-shrink-0 w-[85vw] md:w-80 snap-start">
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
        className="min-h-[360px] rounded-xl transition-colors space-y-2 p-2.5"
        style={{
          background: isOver ? 'rgba(82,102,235,0.08)' : 'rgba(30,30,42,0.64)',
          border: isOver
            ? '1px solid rgba(82,102,235,0.3)'
            : '1px solid rgba(112,112,125,0.16)',
          boxShadow: '0 18px 45px rgba(0,0,0,0.16)',
        }}
      >
        {deals.length === 0 ? (
          <div className="flex min-h-[330px] items-center justify-center rounded-lg" style={{ border: '1px dashed rgba(112,112,125,0.16)', background: 'rgba(12,12,20,0.18)', fontSize: '12px', color: 'var(--lead)', textAlign: 'center', padding: '24px' }}>
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

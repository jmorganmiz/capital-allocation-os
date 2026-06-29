'use client'

import { useDraggable } from '@dnd-kit/core'
import { Deal, DealStage } from '@/lib/types/database'
import Link from 'next/link'

interface Props {
  deal: Deal & {
    owner?: { full_name: string | null } | null
    latest_stage_event_at?: string | null
    hasNotes?: boolean
  }
  stage: DealStage
  onKill: (deal: Deal) => void
  onMove: (deal: Deal) => void
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

function staleColor(sinceDate: string | null | undefined): string {
  if (!sinceDate) return 'var(--lead)'
  const days = Math.floor((Date.now() - new Date(sinceDate).getTime()) / (1000 * 60 * 60 * 24))
  if (days >= 30) return '#f87171'
  if (days >= 14) return '#fbbf24'
  return 'var(--lead)'
}

export default function DealCard({ deal, stage, onKill, onMove }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { deal, fromStageId: stage.id },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
    : undefined

  const time = timeInStage(deal.latest_stage_event_at)
  const timeColor = staleColor(deal.latest_stage_event_at)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group rounded-lg p-3.5 select-none transition-colors md:cursor-grab md:active:cursor-grabbing
        ${isDragging ? 'opacity-50' : ''}`}
      style={{
        ...style,
        background: 'var(--graphite)',
        border: '1px solid rgba(112,112,125,0.18)',
      }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <Link
          href={`/deals/${deal.id}`}
          onClick={e => e.stopPropagation()}
          className="text-sm font-medium leading-snug transition-colors"
          style={{ color: 'var(--starlight)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--mercury-blue)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--starlight)')}
        >
          {deal.title}
        </Link>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onKill(deal) }}
          className="hidden md:block flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
          style={{ color: 'var(--lead)', fontSize: '12px', lineHeight: 1 }}
          title="Kill deal"
        >
          ✕
        </button>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        {deal.market && (
          <span style={{ fontSize: '11px', color: 'var(--lead)' }}>{deal.market}</span>
        )}
        {deal.deal_type && (
          <span style={{
            fontSize: '11px', color: 'var(--silver)',
            background: 'rgba(112,112,125,0.12)',
            border: '1px solid rgba(112,112,125,0.18)',
            borderRadius: '4px',
            padding: '1px 6px',
          }}>
            {deal.deal_type}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {time && (
            <span style={{ fontSize: '11px', color: timeColor, fontWeight: 500 }}>{time}</span>
          )}
          {deal.hasNotes && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#4ade80', flexShrink: 0,
              display: 'inline-block',
            }} title="Has notes" />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {deal.owner && (
            <div
              className="w-5 h-5 rounded-full text-white flex items-center justify-center font-semibold flex-shrink-0"
              style={{ background: 'var(--mercury-blue)', fontSize: '9px' }}
              title={deal.owner.full_name ?? ''}
            >
              {initials(deal.owner.full_name)}
            </div>
          )}
          {/* Move button — mobile only */}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMove(deal) }}
            className="md:hidden text-xs rounded px-2 py-0.5 font-medium"
            style={{
              color: 'var(--mercury-blue)',
              border: '1px solid rgba(82,102,235,0.3)',
              background: 'rgba(82,102,235,0.08)',
            }}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useDraggable } from '@dnd-kit/core'
import { Deal, DealStage } from '@/lib/types/database'
import Link from 'next/link'

interface Props {
  deal: Deal & {
    owner?: { full_name: string | null } | null
    latest_stage_event_at?: string | null
    hasNotes?: boolean
    score?: number | null
    asking_price?: number | null
    unit_count?: number | null
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
  const score = deal.score ?? null

  const scoreStyle = score === null ? null : score >= 70
    ? { bg: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }
    : score >= 45
    ? { bg: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }
    : { bg: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group rounded-lg p-3 select-none md:cursor-grab md:active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
      style={{
        ...style,
        background: 'var(--graphite)',
        border: '1px solid rgba(112,112,125,0.2)',
        boxShadow: 'var(--card-shadow)',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = 'rgba(82,102,235,0.35)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(112,112,125,0.2)' }}
    >
      {/* Title + score badge row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <Link
          href={`/deals/${deal.id}`}
          onClick={e => e.stopPropagation()}
          className="text-sm font-semibold leading-snug flex-1"
          style={{ color: 'var(--starlight)', fontSize: '13px' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--mercury-blue)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--starlight)')}
        >
          {deal.title}
        </Link>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {scoreStyle && (
            <span style={{
              fontSize: '11px', fontWeight: 700,
              background: scoreStyle.bg, border: scoreStyle.border,
              color: scoreStyle.color,
              borderRadius: '999px', padding: '2px 7px',
            }}>
              {score}
            </span>
          )}
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onKill(deal) }}
            className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--lead)', fontSize: '11px', lineHeight: 1 }}
            title="Kill deal"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Location + type row */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {deal.market && (
          <span style={{ fontSize: '11px', color: 'var(--lead)' }}>{deal.market}</span>
        )}
        {deal.deal_type && (
          <span style={{
            fontSize: '10px', fontWeight: 600,
            color: 'var(--ghost-blue)',
            background: 'rgba(82,102,235,0.12)',
            border: '1px solid rgba(82,102,235,0.22)',
            borderRadius: '999px',
            padding: '2px 7px',
            letterSpacing: '0.03em',
          }}>
            {deal.deal_type}
          </span>
        )}
      </div>

      {/* Price + units */}
      {(deal.asking_price || deal.unit_count) && (
        <div className="mb-2.5 flex items-center gap-2">
          {deal.asking_price && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--starlight)' }}>
              {deal.asking_price >= 1_000_000
                ? `$${(deal.asking_price / 1_000_000).toFixed(deal.asking_price % 1_000_000 === 0 ? 0 : 2)}M`
                : `$${(deal.asking_price / 1_000).toFixed(0)}K`}
            </span>
          )}
          {deal.unit_count && (
            <span style={{ fontSize: '11px', color: 'var(--lead)' }}>· {deal.unit_count} units</span>
          )}
        </div>
      )}

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {time && (
            <span style={{ fontSize: '11px', color: timeColor, fontWeight: 500 }}>{time}</span>
          )}
          {deal.hasNotes && (
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', flexShrink: 0 }} title="Has notes" />
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
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMove(deal) }}
            className="md:hidden text-xs rounded px-2 py-0.5 font-medium"
            style={{ color: 'var(--mercury-blue)', border: '1px solid rgba(82,102,235,0.3)', background: 'rgba(82,102,235,0.08)' }}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  )
}

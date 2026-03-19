'use client'

import { useDraggable } from '@dnd-kit/core'
import { Deal, DealStage } from '@/lib/types/database'
import Link from 'next/link'

interface Props {
  deal: Deal & {
    owner?: { full_name: string | null } | null
    latest_stage_event_at?: string | null
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

export default function DealCard({ deal, stage, onKill, onMove }: Props) {
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
      className={`bg-white border border-gray-200 rounded-lg p-3 md:cursor-grab md:active:cursor-grabbing
                  shadow-sm hover:shadow-md transition-shadow select-none
                  ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/deals/${deal.id}`}
          onClick={e => e.stopPropagation()}
          className="text-sm font-medium text-gray-900 hover:text-blue-700 leading-snug"
        >
          {deal.title}
        </Link>
        {/* Kill button — desktop only */}
        <button
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
          {deal.source_name && (
            <span className="text-xs text-gray-400">· {deal.source_name}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {deal.latest_stage_event_at && (
            <span className="text-xs text-amber-500 font-medium">
              {timeInStage(deal.latest_stage_event_at)}
            </span>
          )}
          {deal.owner && (
            <div className="w-5 h-5 rounded-full bg-gray-800 text-white text-xs flex items-center justify-center font-medium"
                 title={deal.owner.full_name ?? ''}>
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

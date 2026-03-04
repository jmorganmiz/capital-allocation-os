'use client'

import Link from 'next/link'
import { Deal } from '@/lib/types/database'

interface Props {
  deal: Deal
  onDragStart: () => void
}

export default function DealCard({ deal, onDragStart }: Props) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white border border-gray-200 rounded-md p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <Link href={`/deals/${deal.id}`} className="block" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-medium text-gray-900 mb-1 hover:text-blue-700 transition-colors">
          {deal.title}
        </p>
      </Link>
      <div className="flex flex-wrap gap-1">
        {deal.market && (
          <span className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">
            {deal.market}
          </span>
        )}
        {deal.deal_type && (
          <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
            {deal.deal_type}
          </span>
        )}
      </div>
    </div>
  )
}

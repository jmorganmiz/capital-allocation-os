'use client'

import { Deal, DealStage } from '@/lib/types/database'

interface Props {
  deal: Deal
  stages: DealStage[]
  onMove: (newStageId: string, oldStageId: string) => void
  onClose: () => void
}

export default function MoveSheet({ deal, stages, onMove, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl shadow-2xl w-full max-w-lg mx-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-3 pt-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Move deal</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{deal.title}</p>
        </div>

        <div className="border-t border-gray-100 divide-y divide-gray-100">
          {stages.map(stage => {
            const isCurrent = deal.stage_id === stage.id
            const isTerminal = stage.name === 'Closed'
            return (
              <button
                key={stage.id}
                disabled={isCurrent}
                onClick={() => { onMove(stage.id, deal.stage_id ?? ''); onClose() }}
                className={`w-full text-left px-5 py-3.5 text-sm transition-colors
                  ${isCurrent
                    ? 'text-gray-400 bg-gray-50 cursor-default'
                    : 'text-gray-800 hover:bg-blue-50 active:bg-blue-100'
                  }`}
              >
                <span className={`font-medium ${isTerminal ? 'text-green-600' : ''}`}>
                  {stage.name}
                </span>
                {isCurrent && (
                  <span className="ml-2 text-xs text-gray-400">current</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose} className="w-full text-center text-sm text-gray-500 py-2">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

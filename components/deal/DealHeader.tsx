'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Deal, DealStage, KillReason } from '@/lib/types/database'
import { updateDealStage, killDeal } from '@/lib/actions/deals'
import KillModal from '@/components/pipeline/KillModal'

interface Props {
  deal: Deal
  stages: DealStage[]
  killReasons: KillReason[]
  currentStage?: DealStage
}

export default function DealHeader({ deal, stages, killReasons, currentStage }: Props) {
  const [showKillModal, setShowKillModal] = useState(false)
  const [isPending, startTransition] = useTransition()

  const killedStage = stages.find(s => s.name === 'Killed')

  function handleStageChange(newStageId: string) {
    const targetStage = stages.find(s => s.id === newStageId)
    if (targetStage?.name === 'Killed') {
      setShowKillModal(true)
      return
    }
    startTransition(async () => { await updateDealStage(deal.id, newStageId, deal.stage_id) })
  }

  function handleKillConfirm(killReasonId: string, notes: string) {
    if (!killedStage) return
    startTransition(async () => {
      await killDeal(deal.id, killReasonId, notes || null, deal.stage_id, killedStage.id)
      setShowKillModal(false)
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <Link href="/pipeline" className="hover:text-gray-700">Pipeline</Link>
        <span>/</span>
        <span className="text-gray-800">{deal.title}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{deal.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            {deal.market && <span>{deal.market}</span>}
            {deal.deal_type && <span className="before:content-['·'] before:mr-3">{deal.deal_type}</span>}
            {deal.source_name && <span className="before:content-['·'] before:mr-3">via {deal.source_name}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={deal.stage_id ?? ''}
            onChange={e => handleStageChange(e.target.value)}
            disabled={deal.is_archived || isPending}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {stages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {!deal.is_archived && (
            <button
              onClick={() => setShowKillModal(true)}
              className="btn-danger-outline text-sm"
            >
              Kill Deal
            </button>
          )}

          {deal.is_archived && (
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded px-2 py-1 font-medium">
              Killed
            </span>
          )}
        </div>
      </div>

      {showKillModal && killedStage && (
        <KillModal
          deal={deal}
          killReasons={killReasons}
          onConfirm={handleKillConfirm}
          onCancel={() => setShowKillModal(false)}
        />
      )}
    </div>
  )
}

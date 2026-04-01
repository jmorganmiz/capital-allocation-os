'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Deal, DealStage, KillReason } from '@/lib/types/database'
import { updateDealStage, killDeal, updateDealOwner, updateDealFields } from '@/lib/actions/deals'
import KillModal from '@/components/pipeline/KillModal'

interface Props {
  deal: Deal
  stages: DealStage[]
  killReasons: KillReason[]
  currentStage?: DealStage
  firmUsers: { id: string; full_name: string | null }[]
}

export default function DealHeader({ deal, stages, killReasons, currentStage, firmUsers }: Props) {
  const [showKillModal, setShowKillModal] = useState(false)
  const [ownerId, setOwnerId] = useState(deal.owner_user_id ?? '')
  const [address, setAddress] = useState(deal.address ?? '')
  const [editingAddress, setEditingAddress] = useState(false)
  const [isPending, startTransition] = useTransition()

  const killedStage = stages.find(s => s.name === 'Killed')

  function handleStageChange(newStageId: string) {
    const targetStage = stages.find(s => s.id === newStageId)
    if (targetStage?.name === 'Killed') {
      setShowKillModal(true)
      return
    }
    startTransition(async () => { await updateDealStage(deal.id, newStageId, deal.stage_id ?? '') })
  }

  function handleOwnerChange(newOwnerId: string) {
    setOwnerId(newOwnerId)
    startTransition(async () => { await updateDealOwner(deal.id, newOwnerId || null) })
  }

  function handleKillConfirm(killReasonId: string, notes: string) {
    if (!killedStage) return
    startTransition(async () => {
      await killDeal(deal.id, killReasonId, notes || null, deal.stage_id ?? '', killedStage.id)
      setShowKillModal(false)
    })
  }

  function commitAddress(value: string) {
    setEditingAddress(false)
    const trimmed = value.trim()
    setAddress(trimmed)
    startTransition(async () => { await updateDealFields(deal.id, { address: trimmed || null }) })
  }

  // Use full address for Maps link when available, otherwise fall back to market
  const mapsQuery = address || deal.market
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?q=${encodeURIComponent(mapsQuery)}`
    : null

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <Link href="/pipeline" className="hover:text-gray-700">Pipeline</Link>
        <span>/</span>
        <span className="text-gray-800">{deal.title}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold text-gray-900">{deal.title}</h1>

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
            {/* Address — inline editable */}
            {editingAddress ? (
              <input
                autoFocus
                value={address}
                onChange={e => setAddress(e.target.value)}
                onBlur={e => commitAddress(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitAddress(address)
                  if (e.key === 'Escape') { setAddress(deal.address ?? ''); setEditingAddress(false) }
                }}
                className="text-sm border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                placeholder="123 Main St, Austin, TX 78701"
              />
            ) : (
              <span className="flex items-center gap-1.5">
                <button
                  onClick={() => !deal.is_archived && setEditingAddress(true)}
                  disabled={deal.is_archived}
                  className={`text-sm transition-colors ${
                    address
                      ? 'text-gray-500 hover:text-gray-700'
                      : 'text-gray-300 hover:text-gray-400 italic'
                  } disabled:cursor-default`}
                  title={deal.is_archived ? undefined : 'Click to edit address'}
                >
                  {address || 'Add address'}
                </button>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-blue-500 transition-colors"
                    title="View on Google Maps"
                  >
                    <MapPin size={11} strokeWidth={2} />
                    <span>Map</span>
                  </a>
                )}
              </span>
            )}

            {deal.market && <span className="before:content-['·'] before:mr-3">{deal.market}</span>}
            {deal.deal_type && <span className="before:content-['·'] before:mr-3">{deal.deal_type}</span>}
            {deal.source_name && <span className="before:content-['·'] before:mr-3">via {deal.source_name}</span>}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Owner</label>
            <select
              value={ownerId}
              onChange={e => handleOwnerChange(e.target.value)}
              disabled={deal.is_archived || isPending}
              className="text-sm border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Unassigned</option>
              {firmUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
              ))}
            </select>
          </div>

          <select
            value={deal.stage_id ?? ''}
            onChange={e => handleStageChange(e.target.value)}
            disabled={deal.is_archived || isPending}
            className="text-sm border border-gray-200 rounded-md px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {stages.filter(s => s.name !== 'Killed').map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {!deal.is_archived && (
            <button onClick={() => setShowKillModal(true)} className="btn-danger-outline text-sm">
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

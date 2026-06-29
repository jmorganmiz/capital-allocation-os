'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { Deal, DealStage, KillReason } from '@/lib/types/database'
import { updateDealStage, killDeal, updateDealOwner, updateDealFields } from '@/lib/actions/deals'
import KillModal from '@/components/pipeline/KillModal'
import { showToast } from '@/lib/toast'

interface Props {
  deal: Deal
  stages: DealStage[]
  killReasons: KillReason[]
  currentStage?: DealStage
  firmUsers: { id: string; full_name: string | null }[]
}

export default function DealHeader({ deal, stages, killReasons, firmUsers }: Props) {
  const router = useRouter()
  const [showKillModal, setShowKillModal] = useState(false)
  const [ownerId, setOwnerId] = useState(deal.owner_user_id ?? '')
  const [stageId, setStageId] = useState(deal.stage_id ?? '')
  const [isArchived, setIsArchived] = useState(deal.is_archived)
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
    const previous = stageId
    setStageId(newStageId)
    startTransition(async () => {
      const result = await updateDealStage(deal.id, newStageId, previous)
      if (result.error) {
        setStageId(previous)
        showToast(result.error, 'error')
      }
    })
  }

  function handleOwnerChange(newOwnerId: string) {
    const previous = ownerId
    setOwnerId(newOwnerId)
    startTransition(async () => {
      const result = await updateDealOwner(deal.id, newOwnerId || null)
      if (result.error) {
        setOwnerId(previous)
        showToast(result.error, 'error')
      }
    })
  }

  function handleKillConfirm(killReasonId: string, notes: string) {
    if (!killedStage) return
    startTransition(async () => {
      const result = await killDeal(deal.id, killReasonId, notes || null, stageId, killedStage.id)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      setIsArchived(true)
      setStageId(killedStage.id)
      setShowKillModal(false)
      showToast('Deal moved to Graveyard', 'success')
      router.refresh()
    })
  }

  function commitAddress(value: string) {
    setEditingAddress(false)
    const trimmed = value.trim()
    setAddress(trimmed)
    startTransition(async () => {
      const result = await updateDealFields(deal.id, { address: trimmed || null })
      if (result.error) {
        setAddress(deal.address ?? '')
        showToast(result.error, 'error')
      }
    })
  }

  // Use full address for Maps link when available, otherwise fall back to market
  const mapsQuery = address || deal.market
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?q=${encodeURIComponent(mapsQuery)}`
    : null

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link href="/pipeline" className="hover:text-gray-700">Pipeline</Link>
        <span>/</span>
        <span className="text-gray-800">{deal.title}</span>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
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
                  onClick={() => !isArchived && setEditingAddress(true)}
                  disabled={isArchived}
                  className={`text-sm transition-colors ${
                    address
                      ? 'text-gray-500 hover:text-gray-700'
                      : 'text-gray-300 hover:text-gray-400 italic'
                  } disabled:cursor-default`}
                  title={isArchived ? undefined : 'Click to edit address'}
                >
                  {address || 'Add address'}
                </button>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 transition-colors font-medium"
                    title="View on Google Maps"
                  >
                    <MapPin size={13} strokeWidth={2} />
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
              disabled={isArchived || isPending}
              className="input-base disabled:opacity-50"
              style={{ padding: '5px 10px', fontSize: '12px' }}
            >
              <option value="">Unassigned</option>
              {firmUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name ?? u.id}</option>
              ))}
            </select>
          </div>

          <select
            value={stageId}
            onChange={e => handleStageChange(e.target.value)}
            disabled={isArchived || isPending}
            className="input-base disabled:opacity-50"
            style={{ padding: '5px 10px', fontSize: '12px' }}
          >
            {stages.filter(s => s.name !== 'Killed').map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {!isArchived && (
            <button onClick={() => setShowKillModal(true)} className="btn-danger-outline text-sm">
              Kill Deal
            </button>
          )}

          {isArchived && (
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

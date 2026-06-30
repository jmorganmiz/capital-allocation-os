'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { useState, useTransition } from 'react'
import KillModal from '@/components/pipeline/KillModal'
import { killDeal, updateDealFields, updateDealOwner, updateDealStage } from '@/lib/actions/deals'
import { showToast } from '@/lib/toast'
import { Deal, DealStage, KillReason } from '@/lib/types/database'

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

  const killedStage = stages.find((stage) => stage.name === 'Killed')

  function handleStageChange(newStageId: string) {
    const targetStage = stages.find((stage) => stage.id === newStageId)
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

  const mapsQuery = address || deal.market
  const mapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?q=${encodeURIComponent(mapsQuery)}`
    : null

  return (
    <div className="app-detail-header">
      <div className="app-detail-breadcrumb">
        <Link href="/pipeline">Pipeline</Link>
        <span>/</span>
        <span>{deal.title}</span>
      </div>

      <div className="app-detail-header-main">
        <div className="app-detail-heading">
          <h1 className="app-detail-title">{deal.title}</h1>

          <div className="app-detail-meta">
            {editingAddress ? (
              <input
                autoFocus
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                onBlur={(event) => commitAddress(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitAddress(address)
                  if (event.key === 'Escape') {
                    setAddress(deal.address ?? '')
                    setEditingAddress(false)
                  }
                }}
                placeholder="123 Main St, Austin, TX 78701"
              />
            ) : (
              <span className="app-detail-address">
                <button
                  onClick={() => !isArchived && setEditingAddress(true)}
                  disabled={isArchived}
                  data-empty={!address}
                  title={isArchived ? undefined : 'Click to edit address'}
                >
                  {address || 'Add address'}
                </button>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on Google Maps"
                  >
                    <MapPin size={13} strokeWidth={2} />
                    <span>Map</span>
                  </a>
                )}
              </span>
            )}

            {deal.market && <span className="app-detail-meta-dot">{deal.market}</span>}
            {deal.deal_type && <span className="app-detail-meta-dot">{deal.deal_type}</span>}
            {deal.source_name && <span className="app-detail-meta-dot">via {deal.source_name}</span>}
          </div>
        </div>

        <div className="app-detail-actions">
          <label>
            <span>Owner</span>
            <select
              value={ownerId}
              onChange={(event) => handleOwnerChange(event.target.value)}
              disabled={isArchived || isPending}
            >
              <option value="">Unassigned</option>
              {firmUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.full_name ?? user.id}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Stage</span>
            <select
              value={stageId}
              onChange={(event) => handleStageChange(event.target.value)}
              disabled={isArchived || isPending}
            >
              {stages.filter((stage) => stage.name !== 'Killed').map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
          </label>

          {!isArchived && (
            <button onClick={() => setShowKillModal(true)} className="app-detail-kill-button">
              Kill Deal
            </button>
          )}

          {isArchived && (
            <span className="app-detail-killed-badge">Killed</span>
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

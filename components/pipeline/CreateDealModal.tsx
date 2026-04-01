'use client'

import { useState, useTransition } from 'react'
import { Deal, DealStage } from '@/lib/types/database'
import { createDeal } from '@/lib/actions/deals'

interface Props {
  stages: DealStage[]
  onCreated: (deal: Deal) => void
  onCancel: () => void
}

export default function CreateDealModal({ stages, onCreated, onCancel }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    if (!formData.get('title')) {
      setError('Deal name is required.')
      return
    }
    startTransition(async () => {
      const result = await createDeal(formData)
      if (result.error) {
        setError(result.error)
      } else if (result.deal) {
        onCreated(result.deal as Deal)
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">Add Deal</h2>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal Name <span className="text-red-500">*</span>
            </label>
            <input name="title" required autoFocus className="input-base" placeholder="123 Main St, Austin TX" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
              <input name="market" className="input-base" placeholder="Austin, TX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Type</label>
              <input name="deal_type" className="input-base" placeholder="Multifamily" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
              <select name="source_type" className="input-base">
                <option value="">Select…</option>
                <option>Broker</option>
                <option>Off-Market</option>
                <option>Referral</option>
                <option>Proprietary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Name</label>
              <input name="source_name" className="input-base" placeholder="CBRE / John Smith" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asking Price</label>
              <input
                name="asking_price"
                type="number"
                min="0"
                step="1"
                className="input-base"
                placeholder="5000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Property Size</label>
              <input name="property_size" className="input-base" placeholder="45,000 SF" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal Structure</label>
              <select name="deal_structure" className="input-base">
                <option value="">Select…</option>
                <option>Acquisition</option>
                <option>Joint Venture</option>
                <option>Sale-Leaseback</option>
                <option>Recapitalization</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financing Type</label>
              <select name="financing_type" className="input-base">
                <option value="">Select…</option>
                <option>Conventional</option>
                <option>Bridge</option>
                <option>CMBS</option>
                <option>Agency</option>
                <option>All Cash</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
              {isPending ? 'Adding…' : 'Add Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

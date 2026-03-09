'use client'

import { useState } from 'react'

interface Props {
  isSubscribed: boolean
}

export default function BillingSettings({ isSubscribed }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
      }
    } catch {
      setError('Failed to start checkout.')
      setLoading(false)
    }
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-1">Billing</h2>
      <p className="text-sm text-gray-500 mb-4">Manage your subscription.</p>

      <div className="border border-gray-200 rounded-lg p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {isSubscribed ? 'Team Plan' : 'Free Beta'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isSubscribed ? '$99 / month · All features included' : 'All features available during beta'}
            </p>
          </div>
          {isSubscribed ? (
            <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-2 py-1 font-medium">
              Active
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-1 font-medium">
              Beta
            </span>
          )}
        </div>

        {!isSubscribed && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Redirecting…' : 'Subscribe — $99/month'}
            </button>
            <p className="text-xs text-gray-400 mt-2">Billed monthly. Cancel anytime.</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    </section>
  )
}

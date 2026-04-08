'use client'

import { useState } from 'react'

interface Props {
  isSubscribed: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: number | null
}

export default function BillingSettings({ isSubscribed, cancelAtPeriodEnd: initialCancelAtPeriodEnd, currentPeriodEnd: initialPeriodEnd }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(initialCancelAtPeriodEnd)
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(initialPeriodEnd)

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

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setCancelAtPeriodEnd(true)
        setCurrentPeriodEnd(data.currentPeriodEnd ?? null)
        setShowCancelConfirm(false)
      } else {
        setError(data.error ?? 'Failed to cancel subscription.')
      }
    } catch {
      setError('Failed to cancel subscription.')
    } finally {
      setLoading(false)
    }
  }

  const periodEndDate = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

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
              {isSubscribed ? '$149 / month · All features included' : 'All features available during beta'}
            </p>
          </div>
          {isSubscribed ? (
            <span className={`text-xs border rounded px-2 py-1 font-medium ${
              cancelAtPeriodEnd
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {cancelAtPeriodEnd ? 'Canceling' : 'Active'}
            </span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-1 font-medium">
              Beta
            </span>
          )}
        </div>

        {/* Pending cancellation notice */}
        {isSubscribed && cancelAtPeriodEnd && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
              Your subscription will cancel at the end of your billing period.
              {periodEndDate && ` You'll keep access until ${periodEndDate}.`}
            </p>
          </div>
        )}

        {/* Subscribe button — only show if not subscribed and not pending cancel */}
        {!isSubscribed && !cancelAtPeriodEnd && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Redirecting…' : 'Subscribe — $149/month'}
            </button>
            <p className="text-xs text-gray-400 mt-2">
              You will be charged $149/month on a recurring basis. Cancel anytime by emailing{' '}
              <a href="mailto:jack@getdealstash.com" className="hover:underline">jack@getdealstash.com</a>.
            </p>
          </div>
        )}

        {/* Cancel button — only show if active and not already pending cancel */}
        {isSubscribed && !cancelAtPeriodEnd && !showCancelConfirm && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Cancel subscription
            </button>
          </div>
        )}

        {/* Confirmation prompt */}
        {showCancelConfirm && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-700 mb-3">
              Are you sure? You'll keep access until the end of your billing period.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="text-sm bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Canceling…' : 'Yes, cancel subscription'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
                className="btn-ghost text-sm"
              >
                Never mind
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    </section>
  )
}

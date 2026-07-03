'use client'

import { useState } from 'react'

interface Props {
  isSubscribed: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: number | null
  underwritingEnabled: boolean
  underwritingAllowance: number
  underwritingCreditsUsed: number
}

export default function BillingSettings({ isSubscribed, cancelAtPeriodEnd: initialCancelAtPeriodEnd, currentPeriodEnd: initialPeriodEnd, underwritingEnabled, underwritingAllowance, underwritingCreditsUsed }: Props) {
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

  const planName = isSubscribed ? 'Team Plan' : 'Free Beta'
  const planDetail = isSubscribed ? '$149 / month · All features included' : 'All features available during beta'

  return (
    <section>
      <div className="app-settings-section-header">
        <div>
          <p>Subscription</p>
          <h2>Billing</h2>
        </div>

        {underwritingEnabled && (
          <div className="app-underwriting-usage">
            <div>
              <p>Full Underwrite allowance</p>
              <strong>{Math.max(0, underwritingAllowance - underwritingCreditsUsed)} remaining</strong>
              <span>{underwritingCreditsUsed} of {underwritingAllowance} used or reserved this period</span>
            </div>
            <div className="app-underwriting-usage-track"><span style={{ width: `${underwritingAllowance ? Math.min(100, (underwritingCreditsUsed / underwritingAllowance) * 100) : 0}%` }} /></div>
            <small>Each approved package includes one Full Underwrite and two revisions. Failed or canceled runs do not consume the allowance.</small>
          </div>
        )}
        <span>{isSubscribed ? (cancelAtPeriodEnd ? 'Canceling' : 'Active') : 'Beta'}</span>
      </div>
      <p className="app-settings-section-copy">
        Manage your subscription, plan status, and billing access for the firm.
      </p>

      <div className="app-settings-billing-card">
        <div className="app-settings-plan-row">
          <div>
            <p>Current plan</p>
            <h3>{planName}</h3>
            <span>{planDetail}</span>
          </div>
          <em data-tone={cancelAtPeriodEnd ? 'amber' : isSubscribed ? 'green' : 'neutral'}>
            {cancelAtPeriodEnd ? 'Canceling' : isSubscribed ? 'Active' : 'Beta'}
          </em>
        </div>

        {isSubscribed && cancelAtPeriodEnd && (
          <div className="app-settings-cancel-box" data-tone="amber">
            <strong>Cancellation scheduled</strong>
            <span>
              Your subscription will cancel at the end of your billing period.
              {periodEndDate ? ` You will keep access until ${periodEndDate}.` : ''}
            </span>
          </div>
        )}

        {!isSubscribed && !cancelAtPeriodEnd && (
          <div className="app-settings-billing-action">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Redirecting...' : 'Subscribe — $149/month'}
            </button>
            <p className="app-settings-billing-note">
              You will be charged $149/month on a recurring basis. Cancel anytime by emailing{' '}
              <a href="mailto:hello@getdealstash.com">hello@getdealstash.com</a>.
            </p>
          </div>
        )}

        {isSubscribed && !cancelAtPeriodEnd && !showCancelConfirm && (
          <div className="app-settings-billing-action">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="app-settings-danger-link"
            >
              Cancel subscription
            </button>
          </div>
        )}

        {showCancelConfirm && (
          <div className="app-settings-cancel-box">
            <strong>Cancel subscription?</strong>
            <span>You will keep access until the end of your billing period.</span>
            <div className="app-settings-form-actions">
              <button
                onClick={handleCancel}
                disabled={loading}
                data-danger="true"
              >
                {loading ? 'Canceling...' : 'Yes, cancel subscription'}
              </button>
              <button
                onClick={() => setShowCancelConfirm(false)}
                disabled={loading}
              >
                Never mind
              </button>
            </div>
          </div>
        )}

        {error && <p className="app-settings-status error">{error}</p>}
      </div>
    </section>
  )
}

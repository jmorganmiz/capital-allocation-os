'use client'

import Link from 'next/link'
import { getAccessState } from '@/lib/workflow.mjs'

interface Props {
  trialEndsAt: string | null
  subscriptionStatus: string | null
}

export default function TrialBanner({ trialEndsAt, subscriptionStatus }: Props) {
  const { subscribed, trialActive, daysLeft } = getAccessState({ trialEndsAt, subscriptionStatus })
  if (subscribed || !trialActive) return null
  return (
    <div style={{
      background: '#1e1e2a',
      borderBottom: '1px solid rgba(112,112,125,0.15)',
      padding: '8px 48px',
      fontSize: '12px',
      color: '#70707d',
      textAlign: 'center',
      flexShrink: 0,
    }}>
      Your free trial has {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining.{' '}
      <Link href="/settings" style={{ color: '#5266eb', textDecoration: 'none' }}>View billing</Link>
    </div>
  )
}

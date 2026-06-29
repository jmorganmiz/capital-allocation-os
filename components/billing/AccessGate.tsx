'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getAccessState } from '@/lib/workflow.mjs'

interface Props {
  trialEndsAt: string | null
  subscriptionStatus: string | null
  children: React.ReactNode
}

export default function AccessGate({ trialEndsAt, subscriptionStatus, children }: Props) {
  const pathname = usePathname()
  const { subscribed, trialActive, daysLeft } = getAccessState({ trialEndsAt, subscriptionStatus })

  if (!subscribed && !trialActive && pathname !== '/settings') {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Trial complete</p>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">Keep your deal operation running</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-500">
            Your workspace is preserved. Subscribe to continue adding, scoring, and managing deals.
          </p>
          <Link href="/settings?billing=required" className="btn-primary mt-6 inline-block">Choose your plan</Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {!subscribed && (
        <div className={`border-b px-4 py-2 text-center text-xs ${trialActive ? 'border-blue-100 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
          {trialActive ? (
            <>Your free trial has {daysLeft} day{daysLeft === 1 ? '' : 's'} remaining. <Link href="/settings" className="font-semibold underline">View billing</Link></>
          ) : (
            <>Your trial has ended. Subscribe below to restore full access.</>
          )}
        </div>
      )}
      {children}
    </>
  )
}

'use client'

import { useActionState } from 'react'
import { setupWorkspaceAction } from './actions'

export default function OnboardingPage() {
  const [state, action, isPending] = useActionState(setupWorkspaceAction, null)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set up your workspace</h1>
          <p className="text-sm text-gray-500 mt-1">
            You're almost in. What should we call your firm?
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
            <input
              name="firm_name"
              required
              className="input-base"
              placeholder="Acme Capital"
              autoFocus
            />
          </div>

          <button type="submit" disabled={isPending} className="btn-primary w-full disabled:opacity-50">
            {isPending ? 'Setting up…' : 'Create Workspace'}
          </button>
        </form>
      </div>
    </div>
  )
}

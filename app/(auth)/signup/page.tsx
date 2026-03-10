'use client'

import { Suspense } from 'react'
import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { signUpAction } from './actions'
import GoogleButton from '@/components/auth/GoogleButton'

function SignupForm() {
  const searchParams = useSearchParams()
  const invite = searchParams.get('invite') ?? ''
  const email = searchParams.get('email') ?? ''
  const isInvite = !!invite

  const [state, action, isPending] = useActionState(signUpAction, null)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dealstash</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isInvite ? "You've been invited to join a team." : 'Create your workspace.'}
          </p>
        </div>

        {!isInvite && (
          <>
            <GoogleButton />
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 border-t border-gray-100" />
              <span className="text-xs text-gray-400">or</span>
              <div className="flex-1 border-t border-gray-100" />
            </div>
          </>
        )}

        {state?.error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        <form action={action} className="space-y-4">
          <input type="hidden" name="invite_token" value={invite} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input name="full_name" required className="input-base" placeholder="Jack Morgan" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              defaultValue={email}
              className="input-base"
              placeholder="jack@firm.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input name="password" type="password" required className="input-base" placeholder="••••••••" minLength={8} />
          </div>

          {!isInvite && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
              <input name="firm_name" required className="input-base" placeholder="Acme Capital" />
            </div>
          )}

          <button type="submit" disabled={isPending} className="btn-primary w-full mt-2 disabled:opacity-50">
            {isPending
              ? (isInvite ? 'Joining…' : 'Creating…')
              : (isInvite ? 'Accept Invite & Join Team' : 'Create Workspace')}
          </button>
        </form>

        <p className="text-xs text-gray-400 mt-4 text-center">
          By signing up, you agree to our{' '}
          <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
        </p>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}

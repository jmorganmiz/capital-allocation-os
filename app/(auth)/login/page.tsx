'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'
import GoogleButton from '@/components/auth/GoogleButton'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">Dealstash</p>

        <GoogleButton />

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 border-t border-gray-100" />
          <span className="text-xs text-gray-400">or</span>
          <div className="flex-1 border-t border-gray-100" />
        </div>

        {state?.error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{state.error}</p>
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" required className="input-base" autoComplete="email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input name="password" type="password" required className="input-base" autoComplete="current-password" />
          </div>
          <button type="submit" disabled={isPending} className="w-full btn-primary disabled:opacity-50">
            {isPending ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 text-center">
          New team?{' '}
          <a href="/signup" className="text-blue-600 hover:underline">Create workspace</a>
        </p>
      </div>
    </div>
  )
}

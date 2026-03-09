import { signUpAction } from './actions'

interface Props {
  searchParams: { invite?: string; email?: string }
}

export default function SignupPage({ searchParams }: Props) {
  const isInvite = !!searchParams.invite

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dealstash</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isInvite ? "You've been invited to join a team." : 'Create your workspace.'}
          </p>
        </div>

        <form action={signUpAction as any} className="space-y-4">
          <input type="hidden" name="invite_token" value={searchParams.invite ?? ''} />

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
              defaultValue={searchParams.email ?? ''}
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

          <button type="submit" className="btn-primary w-full mt-2">
            {isInvite ? 'Accept Invite & Join Team' : 'Create Workspace'}
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-6 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}

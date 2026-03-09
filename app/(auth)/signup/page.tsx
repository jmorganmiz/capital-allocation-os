import { signUpAction } from './actions'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Create your workspace</h1>
        <p className="text-sm text-gray-500 mb-6">Dealstash</p>

        <form action={signUpAction as any} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name</label>
            <input name="firm_name" required placeholder="Acme Capital" className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input name="full_name" placeholder="Jane Smith" className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input name="email" type="email" required placeholder="jane@acmecap.com" className="input-base" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input name="password" type="password" required minLength={8} className="input-base" />
          </div>
          <button type="submit" className="w-full btn-primary mt-2">
            Create Workspace
          </button>
        </form>

        <p className="mt-4 text-sm text-gray-500 text-center">
          Already have an account?{' '}
          <a href="/login" className="text-blue-600 hover:underline">Log in</a>
        </p>
      </div>
    </div>
  )
}

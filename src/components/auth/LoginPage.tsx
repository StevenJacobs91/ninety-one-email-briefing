import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'login') {
      const err = await signIn(email, password)
      if (err) setError(err)
    } else {
      const err = await signUp(email, password, displayName || undefined)
      if (err) {
        setError(err)
      } else {
        setSignupSuccess(true)
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#134848] to-[#0a3323] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Ninety One</h1>
          <p className="text-sm text-white/60 mt-1">Email Briefing Platform</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          {signupSuccess ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-sm text-gray-600 mb-6">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <button
                onClick={() => { setSignupSuccess(false); setMode('login') }}
                className="text-sm text-[#134848] hover:underline font-medium"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848] focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848] focus:border-transparent"
                    placeholder="you@ninetyone.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#134848] focus:border-transparent"
                    placeholder="Min. 6 characters"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#134848] text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#0d3232] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading
                    ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                    : (mode === 'login' ? 'Sign in' : 'Create account')
                  }
                </button>
              </form>

              <div className="mt-6 text-center">
                {mode === 'login' ? (
                  <p className="text-sm text-gray-600">
                    Don't have an account?{' '}
                    <button
                      onClick={() => { setMode('signup'); setError('') }}
                      className="text-[#134848] hover:underline font-medium"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <button
                      onClick={() => { setMode('login'); setError('') }}
                      className="text-[#134848] hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-white/40 mt-6">
          Ninety One Email Briefing Platform
        </p>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const navigate           = useNavigate()
  const [mode, setMode]    = useState('login')   // 'login' | 'signup'
  const [email, setEmail]  = useState('')
  const [pass, setPass]    = useState('')
  const [error, setError]  = useState('')
  const [loading, setLoading] = useState(false)
  const [info, setInfo]    = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, pass)
        if (error) { setError(error.message); return }
        navigate('/')
      } else {
        const { error } = await signUp(email, pass)
        if (error) { setError(error.message); return }
        setInfo('Check your email to confirm your account, then log in.')
        setMode('login')
        setPass('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <span className="text-white text-2xl font-bold">H</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-brand-500">Har</span>
          <span className="text-gray-900">Zo</span>
          <span className="text-brand-400">Ella</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">Your daily health companion</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Mode toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {['login', 'signup'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); setInfo('') }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
                ${mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            {mode === 'signup' && (
              <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}
          {info && (
            <p className="text-sm text-brand-600 bg-brand-50 px-3 py-2 rounded-lg">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-brand-500 text-white font-semibold rounded-xl shadow-sm hover:bg-brand-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}

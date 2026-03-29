import { useState } from 'react'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = (e) => {
    e.preventDefault()
    setLoading(true)
    // Just accept any login
    setTimeout(() => {
      onLogin(email)
    }, 500)
  }

  return (
    <div className="min-h-screen bg-bar-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-bar-accent mb-2">🍻 BarManager</h1>
          <p className="text-gray-400">Restaurant Management Made Easy</p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 text-center">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@bar.com" required />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

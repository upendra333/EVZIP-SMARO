import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLogin } from '../hooks/useAuth'
import { useOperator } from '../hooks/useOperator'
import { ROUTES } from '../utils/constants'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const loginMutation = useLogin()
  const { setOperator } = useOperator()
  const navigate = useNavigate()

  // Check if already logged in
  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser)
        setOperator(user.name, user.role)
        navigate(ROUTES.DASHBOARD)
      } catch {
        // Invalid user data, clear it
        localStorage.removeItem('currentUser')
      }
    }
  }, [navigate, setOperator])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password')
      return
    }

    try {
      await loginMutation.mutateAsync({ username: username.trim(), password })
      // User is already stored in localStorage by useLogin hook
      // Use hard redirect to ensure clean state refresh
      window.location.href = ROUTES.DASHBOARD
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text mb-2">EVZIP - SMARO</h1>
          <p className="text-gray-600">Offline Booking Management Portal <br></br>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setError('')
              }}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}


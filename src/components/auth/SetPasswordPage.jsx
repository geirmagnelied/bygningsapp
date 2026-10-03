import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function SetPasswordPage() {
  const { profile, setPassword } = useAuth()
  const [password, setPasswordValue] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== repeat) {
      setError('Passorda er ikkje like.')
      return
    }
    setSubmitting(true)
    const { error } = await setPassword(password)
    if (error) setError(error.message)
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-center text-2xl font-semibold text-gray-900">Velkomen til Bygningsapp</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          {profile?.name ? `Hei ${profile.name}! ` : ''}Vel eit passord for å fullføre kontoen din.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
              Nytt passord
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="repeat">
              Gjenta passord
            </label>
            <input
              id="repeat"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-status-open">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? 'Lagrar …' : 'Lagre passord og fortset'}
          </button>
        </form>
      </div>
    </div>
  )
}

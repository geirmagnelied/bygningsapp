import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // login | signup
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { error } = mode === 'login' ? await signIn(email, password) : await signUp(email, password, name)

    if (error) setError(feilmelding(error))
    setSubmitting(false)
  }

  function feilmelding(error) {
    if (error.message?.includes('Invalid login credentials')) return 'Feil e-post eller passord.'
    if (error.message?.includes('already registered')) return 'Denne e-posten er alt registrert.'
    return error.message || 'Noko gjekk gale. Prøv igjen.'
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-center text-2xl font-semibold text-gray-900">Bygningsapp</h1>
        <p className="mt-1 text-center text-sm text-gray-500">
          {mode === 'login' ? 'Logg inn på kontoen din' : 'Opprett ny konto'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
                Namn
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
              E-post
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
              Passord
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          {error && <p className="text-sm text-status-open">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting ? 'Vent litt …' : mode === 'login' ? 'Logg inn' : 'Registrer deg'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError('')
          }}
          className="mt-4 w-full text-center text-sm text-brand-600 hover:underline"
        >
          {mode === 'login' ? 'Har du ikkje konto? Registrer deg' : 'Har du alt konto? Logg inn'}
        </button>
      </div>
    </div>
  )
}

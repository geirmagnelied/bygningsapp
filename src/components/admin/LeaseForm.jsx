import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../shared/Modal'

export default function LeaseForm({ property, onClose, onSaved }) {
  const [email, setEmail] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { data: tenant, error: lookupError } = await supabase
      .from('bg_users')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle()

    if (lookupError || !tenant) {
      setError('Fann ikkje ein registrert brukar med denne e-posten. Be leigebuaren registrera seg i appen først.')
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from('bg_leases').insert({
      property_id: property.id,
      tenant_id: tenant.id,
      start_date: startDate,
      is_active: true,
    })

    setSubmitting(false)
    if (insertError) {
      setError(insertError.message)
      return
    }

    onSaved?.()
    onClose()
  }

  return (
    <Modal title={`Legg til leigebuar — ${property.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Leigebuaren må alt ha registrert seg i appen (via "Registrer deg" på innloggingssida) før du kan
          kopla dei til ei leilegheit.
        </p>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
            E-post til leigebuar
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="startDate">
            Startdato
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : 'Legg til'}
        </button>
      </form>
    </Modal>
  )
}

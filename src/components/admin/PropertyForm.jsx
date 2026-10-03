import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../shared/Modal'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function PropertyForm({ eigedom, property, onClose, onSaved }) {
  const [name, setName] = useState(property?.name ?? '')
  const [unitNumber, setUnitNumber] = useState(property?.unit_number ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = { name: name.trim(), unit_number: unitNumber.trim() || null }
    const query = property
      ? supabase.from('bg_properties').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', property.id)
      : supabase.from('bg_properties').insert({ ...payload, project_id: eigedom.id })

    const { error } = await query
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <Modal title={property ? 'Rediger leilegheit' : `Ny leilegheit — ${eigedom.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="name">
            Namn
          </label>
          <input
            id="name"
            required
            placeholder="t.d. Leilegheit 1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="unitNumber">
            Eining/nr (valfritt)
          </label>
          <input id="unitNumber" value={unitNumber} onChange={(e) => setUnitNumber(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : property ? 'Lagre endringar' : 'Opprett leilegheit'}
        </button>
      </form>
    </Modal>
  )
}

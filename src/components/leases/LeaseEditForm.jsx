import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatLeaseNumber } from '../../lib/leases'
import Modal from '../shared/Modal'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function LeaseEditForm({ lease, onClose, onSaved }) {
  const [properties, setProperties] = useState([])
  const [propertyId, setPropertyId] = useState(lease?.property_id ?? '')
  const [startDate, setStartDate] = useState(lease?.start_date ?? new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(lease?.end_date ?? '')
  const [rent, setRent] = useState(lease?.monthly_rent ?? '')
  const [deposit, setDeposit] = useState(lease?.deposit ?? '')
  const [notes, setNotes] = useState(lease?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (lease) return
    supabase
      .from('bg_properties')
      .select('id, name, project:bg_projects(name)')
      .order('name')
      .then(({ data }) => {
        setProperties(data ?? [])
        if (data?.length) setPropertyId((prev) => prev || data[0].id)
      })
  }, [lease])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      start_date: startDate,
      end_date: endDate || null,
      monthly_rent: rent === '' ? null : Number(rent),
      deposit: deposit === '' ? null : Number(deposit),
      notes: notes.trim() || null,
    }

    const query = lease
      ? supabase.from('bg_leases').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', lease.id).select('id').single()
      : supabase.from('bg_leases').insert({ ...payload, property_id: propertyId, is_active: true }).select('id').single()

    const { data, error } = await query
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved?.(data.id)
    onClose()
  }

  return (
    <Modal title={lease ? `Rediger ${formatLeaseNumber(lease.lease_number)}` : 'Nytt leigeforhold'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {!lease && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="property">
              Leilegheit
            </label>
            <select id="property" required value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inputClass}>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project?.name} — {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">Leigeforholdet får automatisk eit unikt løpenummer.</p>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="startDate">
              Startdato
            </label>
            <input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="endDate">
              Sluttdato (valfritt)
            </label>
            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="rent">
              Leige per månad (kr)
            </label>
            <input id="rent" type="number" min="0" step="1" value={rent} onChange={(e) => setRent(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="deposit">
              Depositum (kr)
            </label>
            <input id="deposit" type="number" min="0" step="1" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="notes">
            Notatar
          </label>
          <textarea id="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : lease ? 'Lagre endringar' : 'Opprett leigeforhold'}
        </button>
      </form>
    </Modal>
  )
}

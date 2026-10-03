import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../shared/Modal'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function LeaseForm({ property, onClose, onSaved }) {
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const normalizedEmail = email.trim().toLowerCase()
    const contact = {
      last_name: lastName.trim(),
      first_name: firstName.trim(),
      email: normalizedEmail,
      phone: phone.trim() || null,
    }

    // Same e-post = same person: gjenbruk eksisterande leigebuar (t.d. flytter til ei anna leilegheit).
    const { data: existing } = await supabase.from('bg_tenants').select('id').eq('email', normalizedEmail).maybeSingle()

    let tenantId = existing?.id
    if (tenantId) {
      await supabase.from('bg_tenants').update({ ...contact, updated_at: new Date().toISOString() }).eq('id', tenantId)
    } else {
      const { data: created, error: tenantError } = await supabase.from('bg_tenants').insert(contact).select('id').single()
      if (tenantError) {
        setError(tenantError.message)
        setSubmitting(false)
        return
      }
      tenantId = created.id
    }

    const { error: leaseError } = await supabase.from('bg_leases').insert({
      property_id: property.id,
      tenant_contact_id: tenantId,
      start_date: startDate,
      is_active: true,
    })
    if (leaseError) {
      setError(leaseError.message)
      setSubmitting(false)
      return
    }

    // Er leigebuaren alt registrert i appen, vert kontoen kopla til med ein gong.
    await supabase.rpc('bg_link_tenants')

    setSubmitting(false)
    onSaved?.()
    onClose()
  }

  return (
    <Modal title={`Legg til leigebuar — ${property.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Leigebuaren treng ikkje ha registrert seg først. Registrerer vedkomande seg seinare i appen med same
          e-postadresse, får han automatisk tilgang til denne leilegheita.
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="firstName">
              Namn
            </label>
            <input
              id="firstName"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="lastName">
              Etternamn
            </label>
            <input
              id="lastName"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
            E-postadresse
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="phone">
            Telefonnummer
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="startDate">
            Startdato for leigeforholdet
          </label>
          <input
            id="startDate"
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : 'Legg til leigebuar'}
        </button>
      </form>
    </Modal>
  )
}

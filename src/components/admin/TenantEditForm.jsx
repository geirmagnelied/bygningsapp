import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../shared/Modal'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function TenantEditForm({ tenant, onClose, onSaved }) {
  const [lastName, setLastName] = useState(tenant.last_name)
  const [firstName, setFirstName] = useState(tenant.first_name)
  const [email, setEmail] = useState(tenant.email)
  const [phone, setPhone] = useState(tenant.phone ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase
      .from('bg_tenants')
      .update({
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenant.id)

    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <Modal title="Rediger leigebuar" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="firstName">
              Namn
            </label>
            <input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="lastName">
              Etternamn
            </label>
            <input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
            E-postadresse
          </label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          {tenant.user_id && (
            <p className="mt-1 text-xs text-gray-400">
              Leigebuaren er alt kopla til ein innloggingskonto. Å endre e-posten her endrar ikkje innloggingsadressa.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="phone">
            Telefonnummer
          </label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : 'Lagre endringar'}
        </button>
      </form>
    </Modal>
  )
}

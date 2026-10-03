import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, formatLeaseNumber, inviteTenant, ROLE_LABELS } from '../../lib/leases'
import Modal from '../shared/Modal'

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

// property: leilegheita personen høyrer til. lease: valfritt, viss vi legg til person på eit bestemt leigeforhold.
export default function PersonForm({ property, lease, onClose, onSaved }) {
  const formRef = useRef(null)
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('kontraktspart')
  const [leases, setLeases] = useState([])
  const [leaseChoice, setLeaseChoice] = useState(lease?.id ?? 'new')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (lease) return
    supabase
      .from('bg_leases')
      .select('id, lease_number, start_date')
      .eq('property_id', property.id)
      .eq('is_active', true)
      .order('lease_number')
      .then(({ data }) => {
        setLeases(data ?? [])
        if (data?.length) setLeaseChoice(data[0].id)
      })
  }, [lease, property.id])

  // Lagrar (eller oppdaterer) personen og returnerer id. Same e-post = same person.
  async function savePerson() {
    const normalizedEmail = email.trim().toLowerCase()
    const contact = {
      last_name: lastName.trim(),
      first_name: firstName.trim(),
      email: normalizedEmail,
      phone: phone.trim() || null,
    }

    const { data: existing } = await supabase.from('bg_tenants').select('id').eq('email', normalizedEmail).maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('bg_tenants')
        .update({ ...contact, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) throw error
      return existing.id
    }

    const { data, error } = await supabase.from('bg_tenants').insert(contact).select('id').single()
    if (error) throw error
    return data.id
  }

  async function handleLink(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')

    try {
      const tenantId = await savePerson()

      let leaseId = leaseChoice
      if (leaseChoice === 'new') {
        const { data, error } = await supabase
          .from('bg_leases')
          .insert({ property_id: property.id, start_date: startDate, is_active: true })
          .select('id')
          .single()
        if (error) throw error
        leaseId = data.id
      }

      const { error } = await supabase
        .from('bg_lease_persons')
        .upsert({ lease_id: leaseId, tenant_id: tenantId, role }, { onConflict: 'lease_id,tenant_id' })
      if (error) throw error

      // Har personen alt ein innloggingskonto med same e-post, vert han kopla med ein gong.
      await supabase.rpc('bg_link_tenants')

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Klarte ikkje lagra. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  async function handleInvite() {
    if (!formRef.current.reportValidity()) return
    setBusy(true)
    setError('')
    setInfo('')

    try {
      await savePerson()
      const result = await inviteTenant({ first_name: firstName, last_name: lastName, email: email.trim() })
      if (result.ok) {
        setInfo(`Invitasjon sendt til ${email.trim()}. Personen er lagra.`)
      } else if (result.alreadyRegistered) {
        await supabase.rpc('bg_link_tenants')
        setInfo('Denne e-posten har alt ein konto i appen, så ingen invitasjon er naudsynt. Personen er lagra.')
      } else {
        setError(`Klarte ikkje sende invitasjon: ${result.message}`)
      }
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Klarte ikkje lagra. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={`Legg til leigebuar — ${property.name}`} onClose={onClose}>
      <form ref={formRef} onSubmit={handleLink} className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Personen treng ikkje ha konto først. Registrerer vedkomande seg (eller godtek invitasjonen) med same
          e-postadresse, får han automatisk tilgang.
        </p>

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
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="phone">
            Telefonnummer
          </label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="role">
              Rolle
            </label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {!lease && (
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="leaseChoice">
                Leigeforhold
              </label>
              <select
                id="leaseChoice"
                value={leaseChoice}
                onChange={(e) => setLeaseChoice(e.target.value)}
                className={inputClass}
              >
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {formatLeaseNumber(l.lease_number)} (frå {formatDate(l.start_date)})
                  </option>
                ))}
                <option value="new">Nytt leigeforhold</option>
              </select>
            </div>
          )}
        </div>

        {!lease && leaseChoice === 'new' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="startDate">
              Startdato for nytt leigeforhold
            </label>
            <input id="startDate" type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            <p className="mt-1 text-xs text-gray-400">Leigeforholdet får automatisk nytt løpenummer.</p>
          </div>
        )}

        {info && <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-800">{info}</p>}
        {error && <p className="text-sm text-status-open">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? 'Vent litt …' : 'Knytt til leigeforhold'}
          </button>
          <button
            type="button"
            onClick={handleInvite}
            disabled={busy}
            className="min-h-11 flex-1 rounded-lg border border-brand-500 px-4 py-2.5 text-base font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-60"
          >
            Inviter til bygningsapp
          </button>
        </div>
      </form>
    </Modal>
  )
}

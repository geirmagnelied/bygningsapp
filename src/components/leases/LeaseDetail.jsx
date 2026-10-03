import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  archiveLease,
  formatDate,
  formatLeaseNumber,
  formatMoney,
  fullName,
  inviteTenant,
  ROLE_LABELS,
} from '../../lib/leases'
import PersonForm from '../admin/PersonForm'
import TenantEditForm from '../admin/TenantEditForm'
import LeaseEditForm from './LeaseEditForm'
import LeaseDocuments from './LeaseDocuments'

export default function LeaseDetail() {
  const { leaseId } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [lease, setLease] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [addingPerson, setAddingPerson] = useState(false)
  const [editingTenant, setEditingTenant] = useState(null)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('bg_leases')
      .select(
        '*, property:bg_properties(id, name, project:bg_projects(name)), persons:bg_lease_persons(id, role, tenant:bg_tenants(id, first_name, last_name, email, phone, user_id))',
      )
      .eq('id', leaseId)
      .maybeSingle()
    setLease(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [leaseId])

  async function handleInvite(tenant) {
    setMessage('')
    const result = await inviteTenant(tenant)
    if (result.ok) setMessage(`Invitasjon sendt til ${tenant.email}.`)
    else if (result.alreadyRegistered) setMessage(`${tenant.email} har alt ein konto i appen.`)
    else setMessage(`Klarte ikkje sende invitasjon: ${result.message}`)
  }

  async function handleRemovePerson(person) {
    if (!confirm(`Fjerne ${fullName(person.tenant)} frå leigeforholdet?`)) return
    await supabase.from('bg_lease_persons').delete().eq('id', person.id)
    await load()
  }

  async function handleArchive() {
    if (!confirm(`Arkivere ${formatLeaseNumber(lease.lease_number)}? Leigebuarane mister tilgangen til leilegheita.`)) return
    const { error } = await archiveLease(lease, lease.persons)
    if (error) {
      setMessage(error.message)
      return
    }
    await load()
  }

  if (loading) return <div className="p-4 text-sm text-gray-400">Lastar …</div>
  if (!lease) return <div className="p-4 text-sm text-gray-500">Fann ikkje leigeforholdet.</div>

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <button type="button" onClick={() => navigate('/leigeforhold')} className="text-left text-sm text-brand-600">
        ← Tilbake til leigeforhold
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-brand-700">{formatLeaseNumber(lease.lease_number)}</p>
            <h1 className="text-lg font-semibold text-gray-900">
              {lease.property?.project?.name} — {lease.property?.name}
            </h1>
          </div>
          {!lease.is_active && (
            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">Arkivert</span>
          )}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Fact label="Startdato" value={formatDate(lease.start_date)} />
          <Fact label="Sluttdato" value={lease.end_date ? formatDate(lease.end_date) : 'Løpande'} />
          <Fact label="Leige per månad" value={formatMoney(lease.monthly_rent)} />
          <Fact label="Depositum" value={formatMoney(lease.deposit)} />
        </dl>
        {lease.notes && <p className="mt-3 whitespace-pre-line text-sm text-gray-600">{lease.notes}</p>}

        {isAdmin && lease.is_active && (
          <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-9 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Rediger
            </button>
            <button
              type="button"
              onClick={handleArchive}
              className="min-h-9 rounded-lg border border-status-open/40 px-3 text-sm font-medium text-status-open hover:bg-status-open/5"
            >
              Arkiver leigeforholdet
            </button>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Kontraktspartar og kontaktpersonar</h2>
          {isAdmin && lease.is_active && (
            <button
              type="button"
              onClick={() => setAddingPerson(true)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              + Person
            </button>
          )}
        </div>

        {message && <p className="mb-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">{message}</p>}

        {lease.persons.length === 0 ? (
          <p className="text-sm text-gray-400">Ingen personar registrert enno.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {lease.persons.map((person) => (
              <li key={person.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {fullName(person.tenant)}
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">
                      {ROLE_LABELS[person.role] ?? person.role}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {person.tenant?.email}
                    {person.tenant?.phone && ` · ${person.tenant.phone}`}
                  </p>
                  {isAdmin && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      {person.tenant?.user_id ? 'Har konto i appen' : 'Ikkje registrert i appen'}
                    </p>
                  )}
                </div>
                {isAdmin && lease.is_active && (
                  <span className="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-1 text-xs font-medium">
                    {!person.tenant?.user_id && (
                      <button type="button" onClick={() => handleInvite(person.tenant)} className="text-brand-600 hover:underline">
                        Inviter
                      </button>
                    )}
                    <button type="button" onClick={() => setEditingTenant(person.tenant)} className="text-gray-500 hover:underline">
                      Rediger
                    </button>
                    <button type="button" onClick={() => handleRemovePerson(person)} className="text-status-open hover:underline">
                      Fjern
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <LeaseDocuments leaseId={lease.id} canEdit={isAdmin} />

      {editing && <LeaseEditForm lease={lease} onClose={() => setEditing(false)} onSaved={load} />}
      {addingPerson && (
        <PersonForm property={lease.property} lease={lease} onClose={() => setAddingPerson(false)} onSaved={load} />
      )}
      {editingTenant && <TenantEditForm tenant={editingTenant} onClose={() => setEditingTenant(null)} onSaved={load} />}
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value || '–'}</dd>
    </div>
  )
}

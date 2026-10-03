import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { archiveLease, formatDate, formatLeaseNumber, fullName, inviteTenant, ROLE_LABELS } from '../../lib/leases'
import AdminNav from './AdminNav'
import EigedomForm from './EigedomForm'
import PropertyForm from './PropertyForm'
import PersonForm from './PersonForm'
import TenantEditForm from './TenantEditForm'

const TENANT_FIELDS = 'id, last_name, first_name, email, phone, user_id'

export default function EigedomAdmin() {
  const [eigedomar, setEigedomar] = useState([])
  const [loading, setLoading] = useState(true)
  const [eigedomForm, setEigedomForm] = useState(null) // { eigedom? }
  const [propertyForm, setPropertyForm] = useState(null) // { eigedom, property? }
  const [personFormFor, setPersonFormFor] = useState(null)
  const [editingTenant, setEditingTenant] = useState(null)
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('bg_projects')
      .select(
        `*, properties:bg_properties(id, name, unit_number, leases:bg_leases(id, lease_number, property_id, start_date, end_date, is_active, persons:bg_lease_persons(id, role, tenant:bg_tenants(${TENANT_FIELDS}))))`,
      )
      .order('name')
    setEigedomar(
      (data ?? []).map((e) => ({
        ...e,
        properties: e.properties.map((p) => ({
          ...p,
          leases: p.leases.filter((l) => l.is_active).sort((a, b) => a.lease_number - b.lease_number),
        })),
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleArchive(lease) {
    if (!confirm(`Arkivere ${formatLeaseNumber(lease.lease_number)}? Leigebuarane mister tilgangen til leilegheita.`)) return
    const { error } = await archiveLease(lease, lease.persons)
    if (error) setMessage(error.message)
    await load()
  }

  async function handleInvite(tenant) {
    setMessage('')
    const result = await inviteTenant(tenant)
    if (result.ok) setMessage(`Invitasjon sendt til ${tenant.email}.`)
    else if (result.alreadyRegistered) setMessage(`${tenant.email} har alt ein konto i appen.`)
    else setMessage(`Klarte ikkje sende invitasjon: ${result.message}`)
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-3 text-xl font-semibold text-gray-900">Admin</h1>
      <AdminNav />

      <div className="mb-3 mt-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Eigedomar</h2>
        <button
          type="button"
          onClick={() => setEigedomForm({})}
          className="min-h-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Ny eigedom
        </button>
      </div>

      {message && <p className="mb-3 rounded-lg bg-brand-50 p-3 text-sm text-brand-800">{message}</p>}

      {loading ? (
        <p className="text-sm text-gray-400">Lastar …</p>
      ) : eigedomar.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen eigedomar registrert enno. Start med "+ Ny eigedom".</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {eigedomar.map((eigedom) => (
            <li key={eigedom.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{eigedom.name}</h3>
                  {eigedom.name !== eigedom.address && <p className="text-sm text-gray-500">{eigedom.address}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setEigedomForm({ eigedom })}
                  className="min-h-9 shrink-0 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Rediger
                </button>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <Fact label="Gnr" value={eigedom.gardsnr} />
                <Fact label="Bnr" value={eigedom.bruksnr} />
                <Fact label="Snr" value={eigedom.seksjonsnr} />
                <Fact label="Kjøpt" value={eigedom.purchase_date && formatDate(eigedom.purchase_date)} />
              </dl>
              {eigedom.description && (
                <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{eigedom.description}</p>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <h4 className="text-sm font-medium text-gray-700">Leilegheiter</h4>
                <button
                  type="button"
                  onClick={() => setPropertyForm({ eigedom })}
                  className="text-sm font-medium text-brand-600 hover:underline"
                >
                  + Leilegheit
                </button>
              </div>

              {eigedom.properties.length === 0 ? (
                <p className="mt-2 text-sm text-gray-400">
                  Ingen leilegheiter enno. Leigeforhold knyter seg til ei leilegheit, så legg til minst éi.
                </p>
              ) : (
                <ul className="mt-2 flex flex-col gap-3">
                  {eigedom.properties.map((property) => (
                    <li key={property.id} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-800">{property.name}</span>
                        <span className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => setPropertyForm({ eigedom, property })}
                            className="text-xs font-medium text-gray-500 hover:underline"
                          >
                            Rediger
                          </button>
                          <button
                            type="button"
                            onClick={() => setPersonFormFor(property)}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            + Legg til leigebuar
                          </button>
                        </span>
                      </div>

                      {property.leases.length === 0 ? (
                        <p className="mt-1 text-xs text-gray-400">Ingen aktive leigeforhold.</p>
                      ) : (
                        <ul className="mt-2 flex flex-col gap-3">
                          {property.leases.map((lease) => (
                            <li key={lease.id} className="rounded-md border border-gray-200 bg-white p-2.5">
                              <div className="flex items-center justify-between">
                                <Link
                                  to={`/leigeforhold/${lease.id}`}
                                  className="text-sm font-semibold text-brand-700 hover:underline"
                                >
                                  {formatLeaseNumber(lease.lease_number)}
                                </Link>
                                <span className="flex gap-3 text-xs font-medium">
                                  <Link to={`/leigeforhold/${lease.id}`} className="text-gray-500 hover:underline">
                                    Opne
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleArchive(lease)}
                                    className="text-status-open hover:underline"
                                  >
                                    Arkiver
                                  </button>
                                </span>
                              </div>

                              {lease.persons.length === 0 ? (
                                <p className="mt-1 text-xs text-gray-400">Ingen personar registrert.</p>
                              ) : (
                                <ul className="mt-1.5 flex flex-col gap-2">
                                  {lease.persons.map((person) => (
                                    <li key={person.id} className="flex items-start justify-between gap-2 text-sm">
                                      <div>
                                        <p className="text-gray-800">
                                          {fullName(person.tenant)}
                                          <span className="ml-2 text-xs text-gray-400">
                                            {ROLE_LABELS[person.role] ?? person.role}
                                          </span>
                                          {person.tenant?.user_id ? (
                                            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">
                                              har konto
                                            </span>
                                          ) : (
                                            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                              ikkje registrert
                                            </span>
                                          )}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {person.tenant?.email}
                                          {person.tenant?.phone && ` · ${person.tenant.phone}`}
                                        </p>
                                      </div>
                                      <span className="flex shrink-0 gap-3 text-xs font-medium">
                                        {!person.tenant?.user_id && (
                                          <button
                                            type="button"
                                            onClick={() => handleInvite(person.tenant)}
                                            className="text-brand-600 hover:underline"
                                          >
                                            Inviter
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => setEditingTenant(person.tenant)}
                                          className="text-gray-500 hover:underline"
                                        >
                                          Rediger
                                        </button>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {eigedomForm && (
        <EigedomForm eigedom={eigedomForm.eigedom} onClose={() => setEigedomForm(null)} onSaved={load} />
      )}
      {propertyForm && (
        <PropertyForm
          eigedom={propertyForm.eigedom}
          property={propertyForm.property}
          onClose={() => setPropertyForm(null)}
          onSaved={load}
        />
      )}
      {personFormFor && <PersonForm property={personFormFor} onClose={() => setPersonFormFor(null)} onSaved={load} />}
      {editingTenant && (
        <TenantEditForm tenant={editingTenant} onClose={() => setEditingTenant(null)} onSaved={load} />
      )}
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

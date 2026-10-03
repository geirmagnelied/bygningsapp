import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatLeaseNumber, fullName } from '../../lib/leases'
import LeaseEditForm from './LeaseEditForm'

export default function LeaseList() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('bg_leases')
      .select(
        'id, lease_number, start_date, end_date, is_active, property:bg_properties(name, project:bg_projects(name)), persons:bg_lease_persons(role, tenant:bg_tenants(first_name, last_name))',
      )
      .order('lease_number', { ascending: false })
    setLeases(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const visible = leases.filter((l) => showArchived || l.is_active)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-semibold text-gray-900">Leigeforhold</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="min-h-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Nytt leigeforhold
          </button>
        )}
      </div>

      {isAdmin && (
        <label className="mt-3 flex items-center gap-2 px-4 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Vis òg arkiverte
        </label>
      )}

      {loading ? (
        <p className="p-4 text-sm text-gray-400">Lastar …</p>
      ) : visible.length === 0 ? (
        <p className="p-4 text-sm text-gray-400">
          {isAdmin ? 'Ingen leigeforhold enno. Start med "+ Nytt leigeforhold".' : 'Du har ingen aktive leigeforhold.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2 p-4">
          {visible.map((lease) => (
            <li key={lease.id}>
              <button
                type="button"
                onClick={() => navigate(`/leigeforhold/${lease.id}`)}
                className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-brand-700">{formatLeaseNumber(lease.lease_number)}</p>
                    <p className="font-medium text-gray-900">
                      {lease.property?.project?.name} — {lease.property?.name}
                    </p>
                  </div>
                  {!lease.is_active && (
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                      Arkivert
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {lease.persons.map((p) => fullName(p.tenant)).join(', ') || 'Ingen personar registrert'}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  Frå {formatDate(lease.start_date)}
                  {lease.end_date ? ` til ${formatDate(lease.end_date)}` : ' (løpande)'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {creating && (
        <LeaseEditForm onClose={() => setCreating(false)} onSaved={(id) => navigate(`/leigeforhold/${id}`)} />
      )}
    </div>
  )
}

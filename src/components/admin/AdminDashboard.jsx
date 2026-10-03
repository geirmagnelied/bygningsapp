import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import StatusBadge from '../shared/StatusBadge'
import AdminNav from './AdminNav'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [openCases, setOpenCases] = useState([])
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([])
  const [activeLeaseCount, setActiveLeaseCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: cases }, { data: maint }, { count: leases }] = await Promise.all([
        supabase
          .from('bg_error_reports')
          .select('id, case_number, title, severity, status, property:bg_properties(name, project:bg_projects(name))')
          .in('status', ['open', 'in_progress'])
          .order('created_at', { ascending: false }),
        supabase
          .from('bg_maintenance_plans')
          .select('id, title, next_due_date, property:bg_properties(name, project:bg_projects(name))')
          .not('next_due_date', 'is', null)
          .order('next_due_date', { ascending: true })
          .limit(10),
        supabase.from('bg_leases').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])
      setOpenCases(cases ?? [])
      setUpcomingMaintenance(maint ?? [])
      setActiveLeaseCount(leases ?? 0)
      setLoading(false)
    }

    load()
  }, [])

  if (loading) return <div className="p-4 text-sm text-gray-400">Lastar …</div>

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold text-gray-900">Admin</h1>
      <AdminNav />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <div className="text-2xl font-semibold text-gray-900">{openCases.length}</div>
          <div className="text-xs text-gray-500">opne saker</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <div className="text-2xl font-semibold text-gray-900">{upcomingMaintenance.length}</div>
          <div className="text-xs text-gray-500">komande vedlikehald</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <div className="text-2xl font-semibold text-gray-900">{activeLeaseCount}</div>
          <div className="text-xs text-gray-500">aktive leigeforhold</div>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Opne saker</h2>
        {openCases.length === 0 ? (
          <p className="text-sm text-gray-400">Ingen opne saker.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {openCases.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/saker/${c.id}`)}
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-2.5 text-left hover:border-brand-300"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-400">
                      {c.property?.project?.name} — {c.property?.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {c.severity === 'urgent' && <StatusBadge status="urgent" />}
                    <StatusBadge status={c.status} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Komande vedlikehald</h2>
        {upcomingMaintenance.length === 0 ? (
          <p className="text-sm text-gray-400">Ingenting planlagt.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingMaintenance.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-gray-800">{m.title}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {m.property?.project?.name} — {m.property?.name}
                  </span>
                </div>
                <span className="shrink-0 text-gray-500">{formatDate(m.next_due_date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
}

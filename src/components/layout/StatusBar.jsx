import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'

export default function StatusBar() {
  const { signOut } = useAuth()
  const { activePropertyId, properties, setActivePropertyId } = useProject()
  const navigate = useNavigate()
  const [openCases, setOpenCases] = useState(0)
  const [nextMaintenance, setNextMaintenance] = useState(null)

  useEffect(() => {
    if (!activePropertyId) return

    async function load() {
      const { count } = await supabase
        .from('bg_error_reports')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', activePropertyId)
        .in('status', ['open', 'in_progress'])
      setOpenCases(count ?? 0)

      const { data } = await supabase
        .from('bg_maintenance_plans')
        .select('title, next_due_date')
        .eq('property_id', activePropertyId)
        .not('next_due_date', 'is', null)
        .order('next_due_date', { ascending: true })
        .limit(1)
        .maybeSingle()
      setNextMaintenance(data)
    }

    load()
  }, [activePropertyId])

  return (
    <div className="flex flex-col gap-2 bg-brand-600 px-4 py-3 text-white md:hidden">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Bygningsapp</span>
        <button type="button" onClick={signOut} className="text-sm text-brand-50 underline">
          Logg ut
        </button>
      </div>

      {properties.length > 1 && (
        <select
          value={activePropertyId ?? ''}
          onChange={(e) => setActivePropertyId(e.target.value)}
          className="rounded-lg border border-brand-400 bg-brand-600 px-3 py-1.5 text-sm text-white focus:outline-none"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id} className="text-gray-900">
              {p.project?.name} — {p.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-3 text-sm">
        <button
          type="button"
          onClick={() => navigate('/saker')}
          className="flex-1 rounded-lg bg-brand-500/60 px-3 py-2 text-left"
        >
          <div className="text-lg font-semibold">{openCases}</div>
          <div className="text-brand-50">opne sak{openCases === 1 ? '' : 'er'}</div>
        </button>
        <button
          type="button"
          onClick={() => navigate('/vedlikehald')}
          className="flex-1 rounded-lg bg-brand-500/60 px-3 py-2 text-left"
        >
          <div className="truncate text-sm font-semibold">
            {nextMaintenance ? nextMaintenance.title : 'Ingen planlagt'}
          </div>
          <div className="text-brand-50">
            {nextMaintenance?.next_due_date ? formatDate(nextMaintenance.next_due_date) : 'vedlikehald'}
          </div>
        </button>
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })
}

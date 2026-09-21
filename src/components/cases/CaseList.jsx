import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useProject } from '../../contexts/ProjectContext'
import StatusBadge from '../shared/StatusBadge'

export default function CaseList() {
  const { activePropertyId } = useProject()
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activePropertyId) return

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('bg_error_reports')
        .select('id, case_number, title, severity, status, created_at')
        .eq('property_id', activePropertyId)
        .order('created_at', { ascending: false })
      setCases(data ?? [])
      setLoading(false)
    }

    load()
  }, [activePropertyId])

  return (
    <div className="mx-auto max-w-2xl">
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold text-gray-900">Saker</h1>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-gray-400">Lastar …</p>
      ) : cases.length === 0 ? (
        <p className="p-4 text-sm text-gray-400">Ingen saker registrert enno.</p>
      ) : (
        <ul className="flex flex-col gap-2 p-4">
          {cases.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => navigate(`/saker/${c.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left hover:border-brand-300"
              >
                <div>
                  <p className="text-xs font-medium text-gray-400">{c.case_number}</p>
                  <p className="font-medium text-gray-900">{c.title}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge status={c.status} />
                  {c.severity === 'urgent' && <StatusBadge status="urgent" />}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

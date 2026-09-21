import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useProject } from '../../contexts/ProjectContext'

export default function UpcomingMaintenance() {
  const { activePropertyId } = useProject()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activePropertyId) return

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('bg_maintenance_plans')
        .select('id, title, next_due_date')
        .eq('property_id', activePropertyId)
        .not('next_due_date', 'is', null)
        .order('next_due_date', { ascending: true })
        .limit(5)
      setPlans(data ?? [])
      setLoading(false)
    }

    load()
  }, [activePropertyId])

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-semibold text-gray-900">Komande vedlikehald</h2>

      {loading ? (
        <p className="text-sm text-gray-400">Lastar …</p>
      ) : plans.length === 0 ? (
        <p className="text-sm text-gray-400">Ingenting planlagt.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between text-sm">
              <span className="text-gray-800">{p.title}</span>
              <span className="text-gray-500">{formatDate(p.next_due_date)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import MaintenancePlanList from './MaintenancePlanList'
import MaintenancePlanForm from './MaintenancePlanForm'
import MaintenanceLogForm from './MaintenanceLogForm'

export default function MaintenanceTab() {
  const { isAdmin } = useAuth()
  const { activePropertyId } = useProject()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState(null)
  const [creating, setCreating] = useState(false)
  const [loggingPlan, setLoggingPlan] = useState(null)

  async function load() {
    if (!activePropertyId) return
    setLoading(true)
    const { data } = await supabase
      .from('bg_maintenance_plans')
      .select('*')
      .eq('property_id', activePropertyId)
      .order('next_due_date', { ascending: true, nullsFirst: false })
    setPlans(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [activePropertyId])

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-semibold text-gray-900">Vedlikehald</h1>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="min-h-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Ny plan
          </button>
        )}
      </div>

      {loading ? (
        <p className="p-4 text-sm text-gray-400">Lastar …</p>
      ) : (
        <MaintenancePlanList
          plans={plans}
          isAdmin={isAdmin}
          onEdit={setEditingPlan}
          onLog={setLoggingPlan}
        />
      )}

      {creating && (
        <MaintenancePlanForm onClose={() => setCreating(false)} onSaved={load} />
      )}
      {editingPlan && (
        <MaintenancePlanForm plan={editingPlan} onClose={() => setEditingPlan(null)} onSaved={load} />
      )}
      {loggingPlan && (
        <MaintenanceLogForm plan={loggingPlan} onClose={() => setLoggingPlan(null)} onSaved={load} />
      )}
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import Modal from '../shared/Modal'

export default function MaintenancePlanForm({ plan, onClose, onSaved }) {
  const { user } = useAuth()
  const { activePropertyId, activeProjectId } = useProject()
  const [title, setTitle] = useState(plan?.title ?? '')
  const [description, setDescription] = useState(plan?.description ?? '')
  const [frequency, setFrequency] = useState(plan?.frequency ?? 'yearly')
  const [nextDueDate, setNextDueDate] = useState(plan?.next_due_date ?? '')
  const [isRecurring, setIsRecurring] = useState(plan?.is_recurring ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const payload = {
      project_id: activeProjectId,
      property_id: activePropertyId,
      title,
      description,
      frequency,
      next_due_date: nextDueDate || null,
      is_recurring: isRecurring,
      created_by: user.id,
    }

    const query = plan
      ? supabase.from('bg_maintenance_plans').update(payload).eq('id', plan.id)
      : supabase.from('bg_maintenance_plans').insert(payload)

    const { error } = await query
    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }
    onSaved?.()
    onClose()
  }

  return (
    <Modal title={plan ? 'Rediger plan' : 'Ny vedlikehaldsplan'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="title">
            Tittel
          </label>
          <input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="description">
            Beskriving
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="frequency">
              Frekvens
            </label>
            <select
              id="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="weekly">Kvar veke</option>
              <option value="monthly">Kvar månad</option>
              <option value="yearly">Kvart år</option>
              <option value="custom">Eigendefinert</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="nextDue">
              Neste frist
            </label>
            <input
              id="nextDue"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
          />
          Gjentakande (rekna ut neste frist automatisk ved fullført logg)
        </label>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : 'Lagre'}
        </button>
      </form>
    </Modal>
  )
}

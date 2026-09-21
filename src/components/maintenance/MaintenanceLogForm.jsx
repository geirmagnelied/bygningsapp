import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/storage'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import { computeNextDueDate } from '../../lib/maintenance'
import Modal from '../shared/Modal'

export default function MaintenanceLogForm({ plan, onClose, onSaved }) {
  const { user } = useAuth()
  const { activePropertyId } = useProject()
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const imageUrl = await uploadImage(file, 'vedlikehald')

      const { error: logError } = await supabase.from('bg_maintenance_logs').insert({
        maintenance_plan_id: plan.id,
        property_id: activePropertyId,
        completed_by: user.id,
        completed_date: completedDate,
        notes,
        image_url: imageUrl,
      })
      if (logError) throw logError

      const nextDueDate = plan.is_recurring ? computeNextDueDate(plan.frequency, completedDate) : null
      const { error: planError } = await supabase
        .from('bg_maintenance_plans')
        .update({ last_completed_date: completedDate, ...(nextDueDate ? { next_due_date: nextDueDate } : {}) })
        .eq('id', plan.id)
      if (planError) throw planError

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Klarte ikkje lagra. Prøv igjen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={`Merk utført: ${plan.title}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="completedDate">
            Utført dato
          </label>
          <input
            id="completedDate"
            type="date"
            required
            value={completedDate}
            onChange={(e) => setCompletedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="notes">
            Notat (valfritt)
          </label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="image">
            Bilete (valfritt)
          </label>
          <input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-600"
          />
        </div>

        {error && <p className="text-sm text-status-open">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="min-h-11 rounded-lg bg-brand-500 px-4 py-2.5 text-base font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {submitting ? 'Lagrar …' : 'Merk som utført'}
        </button>
      </form>
    </Modal>
  )
}

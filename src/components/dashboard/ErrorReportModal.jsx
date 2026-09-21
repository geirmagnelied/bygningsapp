import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/storage'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import Modal from '../shared/Modal'

export default function ErrorReportModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const { activePropertyId } = useProject()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('normal')
  const [deadline, setDeadline] = useState('')
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { data: caseNumber, error: rpcError } = await supabase.rpc('bg_next_case_number')
      if (rpcError) throw rpcError

      const imageUrl = await uploadImage(file, 'feilrapportar')

      const { error: insertError } = await supabase.from('bg_error_reports').insert({
        case_number: caseNumber,
        property_id: activePropertyId,
        reported_by: user.id,
        title,
        description,
        severity,
        suggested_deadline: deadline || null,
        image_url: imageUrl,
      })
      if (insertError) throw insertError

      onCreated?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Klarte ikkje senda feilrapport. Prøv igjen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Varsle om feil" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="title">
            Kva gjeld det?
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
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-gray-700">Hastar det?</legend>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSeverity('urgent')}
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                severity === 'urgent'
                  ? 'border-status-open bg-status-open/10 text-status-open'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              Hastar
            </button>
            <button
              type="button"
              onClick={() => setSeverity('normal')}
              className={`min-h-11 flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                severity === 'normal'
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-300 text-gray-600'
              }`}
            >
              Kan vente
            </button>
          </div>
        </fieldset>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="deadline">
            Ønska frist (valfritt)
          </label>
          <input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
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
          {submitting ? 'Sender …' : 'Send feilrapport'}
        </button>
      </form>
    </Modal>
  )
}

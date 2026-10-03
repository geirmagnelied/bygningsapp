import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../lib/storage'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import Modal from '../shared/Modal'

export default function FdvItemForm({ item, categories, defaultCategoryId, onClose, onSaved }) {
  const { user } = useAuth()
  const { activePropertyId, activeProjectId } = useProject()
  const [categoryId, setCategoryId] = useState(item?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? '')
  const [scope, setScope] = useState(item ? (item.property_id ? 'property' : 'project') : 'property')
  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [file, setFile] = useState(null)
  const [visibility, setVisibility] = useState(item?.visibility ?? 'visible')
  const [hiddenFields, setHiddenFields] = useState(item?.hidden_fields ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleHiddenField(field) {
    setHiddenFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const fileUrl = file ? await uploadImage(file, 'fdv') : item?.file_url ?? null

      const payload = {
        project_id: activeProjectId,
        property_id: scope === 'property' ? activePropertyId : null,
        category_id: categoryId,
        title,
        description,
        file_url: fileUrl,
        visibility,
        hidden_fields: visibility === 'partial' ? hiddenFields : [],
        created_by: user.id,
      }

      const query = item
        ? supabase.from('bg_fdv_items').update(payload).eq('id', item.id)
        : supabase.from('bg_fdv_items').insert(payload)

      const { error } = await query
      if (error) throw error

      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Klarte ikkje lagra. Prøv igjen.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title={item ? 'Rediger FDV-post' : 'Ny FDV-post'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="category">
            Kategori
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.section === 'bygning' ? `Bygning › ${c.name}` : c.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-gray-700">Gjeld for</legend>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScope('property')}
              className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${scope === 'property' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600'}`}
            >
              Denne leilegheita
            </button>
            <button
              type="button"
              onClick={() => setScope('project')}
              className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${scope === 'project' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-600'}`}
            >
              Heile bygget
            </button>
          </div>
        </fieldset>

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

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="file">
            Dokument/bilete {item?.file_url && '(lastar opp ny erstattar gamal)'}
          </label>
          <input
            id="file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-600"
          />
        </div>

        <fieldset>
          <legend className="mb-1 text-sm font-medium text-gray-700">Synlegskap for leigebuar</legend>
          <div className="flex flex-col gap-2">
            {[
              ['visible', 'Synleg'],
              ['partial', 'Delvis synleg'],
              ['hidden', 'Skjult'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="visibility"
                  value={value}
                  checked={visibility === value}
                  onChange={() => setVisibility(value)}
                  className="h-4 w-4 text-brand-600 focus:ring-brand-500"
                />
                {label}
              </label>
            ))}
          </div>

          {visibility === 'partial' && (
            <div className="mt-2 flex flex-col gap-1 border-l-2 border-gray-200 pl-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={hiddenFields.includes('description')}
                  onChange={() => toggleHiddenField('description')}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Skjul beskriving
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={hiddenFields.includes('file_url')}
                  onChange={() => toggleHiddenField('file_url')}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Skjul dokument/bilete
              </label>
            </div>
          )}
        </fieldset>

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

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../lib/leases'

const BUCKET = 'bygningsapp-private'

export default function LeaseDocuments({ leaseId, canEdit }) {
  const { user } = useAuth()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase
      .from('bg_lease_documents')
      .select('id, title, file_path, created_at')
      .eq('lease_id', leaseId)
      .order('created_at', { ascending: false })
    setDocuments(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [leaseId])

  async function handleUpload(e) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError('')

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${leaseId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file)
    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('bg_lease_documents').insert({
      lease_id: leaseId,
      title: title.trim() || file.name,
      file_path: path,
      uploaded_by: user.id,
    })
    if (insertError) {
      await supabase.storage.from(BUCKET).remove([path])
      setError(insertError.message)
      setUploading(false)
      return
    }

    setTitle('')
    setFile(null)
    e.target.reset()
    setUploading(false)
    await load()
  }

  async function handleOpen(doc) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60)
    if (error) {
      setError(error.message)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleDelete(doc) {
    if (!confirm(`Slette «${doc.title}»?`)) return
    await supabase.storage.from(BUCKET).remove([doc.file_path])
    await supabase.from('bg_lease_documents').delete().eq('id', doc.id)
    await load()
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-semibold text-gray-900">Dokument og signert kontrakt</h2>

      {loading ? (
        <p className="text-sm text-gray-400">Lastar …</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen dokument lasta opp enno.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-gray-900">{doc.title}</p>
                <p className="text-xs text-gray-400">Lasta opp {formatDate(doc.created_at)}</p>
              </div>
              <span className="flex shrink-0 gap-3 text-xs font-medium">
                <button type="button" onClick={() => handleOpen(doc)} className="text-brand-600 hover:underline">
                  Opne
                </button>
                {canEdit && (
                  <button type="button" onClick={() => handleDelete(doc)} className="text-status-open hover:underline">
                    Slett
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={handleUpload} className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-3">
          <input
            placeholder="Tittel, t.d. Signert leigekontrakt"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <input type="file" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-gray-600" />
          <button
            type="submit"
            disabled={uploading}
            className="min-h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {uploading ? 'Lastar opp …' : 'Last opp dokument'}
          </button>
        </form>
      )}

      {error && <p className="mt-2 text-sm text-status-open">{error}</p>}
    </section>
  )
}

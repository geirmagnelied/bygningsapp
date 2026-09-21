import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import StatusBadge from '../shared/StatusBadge'

const STATUS_OPTIONS = [
  ['open', 'Open'],
  ['in_progress', 'Under arbeid'],
  ['resolved', 'Løyst'],
  ['closed', 'Lukka'],
]

export default function CaseDetail() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [caseData, setCaseData] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: report }, { data: msgs }] = await Promise.all([
      supabase
        .from('bg_error_reports')
        .select('*, reporter:bg_users!bg_error_reports_reported_by_fkey(name)')
        .eq('id', caseId)
        .maybeSingle(),
      supabase
        .from('bg_case_messages')
        .select('id, message, created_at, sender:bg_users(name)')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
    ])
    setCaseData(report)
    setMessages(msgs ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [caseId])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    await supabase.from('bg_case_messages').insert({ case_id: caseId, user_id: user.id, message: text.trim() })
    setText('')
    setSending(false)
    await load()
  }

  async function handleStatusChange(status) {
    await supabase.from('bg_error_reports').update({ status }).eq('id', caseId)
    setCaseData((prev) => ({ ...prev, status }))
  }

  if (loading) return <div className="p-4 text-sm text-gray-400">Lastar …</div>
  if (!caseData) return <div className="p-4 text-sm text-gray-500">Fann ikkje saka.</div>

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <button type="button" onClick={() => navigate('/saker')} className="text-left text-sm text-brand-600">
        ← Tilbake til saker
      </button>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-400">{caseData.case_number}</p>
            <h1 className="text-lg font-semibold text-gray-900">{caseData.title}</h1>
          </div>
          <div className="flex shrink-0 gap-1">
            {caseData.severity === 'urgent' && <StatusBadge status="urgent" />}
            <StatusBadge status={caseData.status} />
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-700">{caseData.description}</p>

        {caseData.image_url && (
          <a href={caseData.image_url} target="_blank" rel="noreferrer" className="mt-2 block">
            <img src={caseData.image_url} alt="" className="max-h-64 rounded-lg border border-gray-200" />
          </a>
        )}

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>Meldt av {caseData.reporter?.name ?? 'ukjend'}</span>
          {caseData.suggested_deadline && <span>Ønska frist: {formatDate(caseData.suggested_deadline)}</span>}
        </div>

        {isAdmin && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-1.5 text-sm font-medium text-gray-700">Endre status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStatusChange(value)}
                  className={`min-h-9 rounded-lg border px-3 text-sm font-medium ${
                    caseData.status === value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">Meldingar</h2>

        {messages.length === 0 ? (
          <p className="text-sm text-gray-400">Ingen meldingar enno.</p>
        ) : (
          <ul className="mb-4 flex flex-col gap-3">
            {messages.map((m) => (
              <li key={m.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <p className="text-sm text-gray-800">{m.message}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {m.sender?.name ?? 'Ukjend'} · {formatDateTime(m.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv ei melding …"
            className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <button
            type="submit"
            disabled={sending}
            className="min-h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'

export default function ChannelFeed() {
  const { isAdmin } = useAuth()
  const { activeProjectId } = useProject()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  async function load() {
    if (!activeProjectId) return
    setLoading(true)
    const { data } = await supabase
      .from('bg_channel_messages')
      .select('id, message, created_at, sender:bg_users(name)')
      .eq('project_id', activeProjectId)
      .order('created_at', { ascending: false })
      .limit(20)
    setMessages(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [activeProjectId])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    const { data: userData } = await supabase.auth.getUser()
    await supabase.from('bg_channel_messages').insert({
      project_id: activeProjectId,
      sent_by: userData.user.id,
      message: text.trim(),
    })
    setText('')
    setSending(false)
    await load()
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-base font-semibold text-gray-900">Meldingar</h2>

      {isAdmin && (
        <form onSubmit={handleSend} className="mb-4 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Skriv ei melding til leigebuarane …"
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
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Lastar …</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen meldingar enno.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li key={m.id} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <p className="text-sm text-gray-800">{m.message}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {m.sender?.name ?? 'Admin'} · {formatDateTime(m.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

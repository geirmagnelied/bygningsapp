import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export default function SettingsTab() {
  const { profile, user, isAdmin, signOut, refreshProfile } = useAuth()
  const [saving, setSaving] = useState(false)

  async function toggleNotifications() {
    setSaving(true)
    await supabase
      .from('bg_users')
      .update({ notifications_enabled: !profile.notifications_enabled })
      .eq('id', user.id)
    await refreshProfile()
    setSaving(false)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold text-gray-900">Innstillingar</h1>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Namn</p>
        <p className="mb-3 font-medium text-gray-900">{profile?.name}</p>
        <p className="text-sm text-gray-500">E-post</p>
        <p className="mb-3 font-medium text-gray-900">{profile?.email}</p>
        <p className="text-sm text-gray-500">Rolle</p>
        <p className="font-medium text-gray-900">{isAdmin ? 'Admin' : 'Leigebuar'}</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <label className="flex items-center justify-between gap-4">
          <span>
            <span className="block font-medium text-gray-900">Varsling</span>
            <span className="block text-sm text-gray-500">Få varsel om nye meldingar og saker</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={profile?.notifications_enabled}
            onClick={toggleNotifications}
            disabled={saving}
            className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${
              profile?.notifications_enabled ? 'bg-brand-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                profile?.notifications_enabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </label>
      </div>

      <button
        type="button"
        onClick={signOut}
        className="min-h-11 rounded-lg border border-gray-300 px-4 py-2.5 text-base font-medium text-gray-600 hover:bg-gray-50"
      >
        Logg ut
      </button>
    </div>
  )
}

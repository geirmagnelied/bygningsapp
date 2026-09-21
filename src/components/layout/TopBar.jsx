import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'

export default function TopBar() {
  const { profile, signOut } = useAuth()
  const { properties, activePropertyId, setActivePropertyId } = useProject()

  return (
    <header className="hidden items-center justify-between border-b border-gray-200 bg-white px-6 py-3 md:flex">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold text-brand-700">Bygningsapp</span>
        {properties.length > 1 && (
          <select
            value={activePropertyId ?? ''}
            onChange={(e) => setActivePropertyId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project?.name} — {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{profile?.name}</span>
        <button
          type="button"
          onClick={signOut}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Logg ut
        </button>
      </div>
    </header>
  )
}

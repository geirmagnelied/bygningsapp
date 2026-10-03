import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const tabs = [
  { to: '/', label: 'Dashbord', icon: '🏠', end: true },
  { to: '/leigeforhold', label: 'Leigeforhold', icon: '📑' },
  { to: '/vedlikehald', label: 'Vedlikehald', icon: '🔧' },
  { to: '/dokument', label: 'Dokument', icon: '📄' },
  { to: '/innstillingar', label: 'Innstillingar', icon: '⚙️' },
]

export default function TabNav() {
  const { isAdmin } = useAuth()
  const items = isAdmin ? [...tabs, { to: '/admin', label: 'Admin', icon: '🛠️' }] : tabs

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white md:static md:justify-center md:border-b md:border-t-0">
      {items.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium md:flex-none md:flex-row md:gap-2 md:px-5 md:py-3 md:text-sm ${
              isActive ? 'text-brand-600' : 'text-gray-500'
            }`
          }
        >
          <span className="text-lg md:text-base">{tab.icon}</span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

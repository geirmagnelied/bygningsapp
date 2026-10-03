import { NavLink } from 'react-router-dom'

const links = [
  { to: '/admin', label: 'Eigedomar', end: true },
  { to: '/admin/oversikt', label: 'Oversikt' },
]

export default function AdminNav() {
  return (
    <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            `flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium ${
              isActive ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  )
}

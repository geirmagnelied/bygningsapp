import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function NoActiveProperty() {
  const { isAdmin } = useAuth()

  if (isAdmin) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Ingen bygg registrert enno.{' '}
        <Link to="/admin/leigebuarar" className="text-brand-600 hover:underline">
          Opprett eit bygg
        </Link>{' '}
        for å koma i gang.
      </div>
    )
  }

  return (
    <div className="p-4 text-sm text-gray-500">
      Du har ingen aktiv leilegheit enno. Ta kontakt med huseigar.
    </div>
  )
}

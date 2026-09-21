import { useState } from 'react'
import { useProject } from '../../contexts/ProjectContext'
import ChannelFeed from './ChannelFeed'
import UpcomingMaintenance from './UpcomingMaintenance'
import ErrorReportButton from './ErrorReportButton'

export default function Dashboard() {
  const { activeProperty, loading } = useProject()
  const [refreshKey, setRefreshKey] = useState(0)

  if (loading) {
    return <div className="p-4 text-sm text-gray-400">Lastar …</div>
  }

  if (!activeProperty) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Du har ingen aktiv leilegheit enno. Ta kontakt med huseigar.
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{activeProperty.project?.name}</h1>
        <p className="text-sm text-gray-500">{activeProperty.name}</p>
      </div>

      <ErrorReportButton onCreated={() => setRefreshKey((k) => k + 1)} />

      <UpcomingMaintenance key={`maint-${refreshKey}`} />
      <ChannelFeed key={`feed-${refreshKey}`} />
    </div>
  )
}

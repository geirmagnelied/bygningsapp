const STYLES = {
  open: 'bg-status-open/10 text-status-open',
  urgent: 'bg-status-urgent/10 text-status-urgent',
  in_progress: 'bg-status-progress/10 text-status-progress',
  resolved: 'bg-status-resolved/10 text-status-resolved',
  closed: 'bg-status-closed/10 text-status-closed',
}

const LABELS = {
  open: 'Open',
  urgent: 'Hastar',
  normal: 'Kan vente',
  in_progress: 'Under arbeid',
  resolved: 'Løyst',
  closed: 'Lukka',
}

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {LABELS[status] ?? status}
    </span>
  )
}

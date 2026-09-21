import { FREQUENCY_LABELS } from '../../lib/maintenance'

export default function MaintenancePlanList({ plans, isAdmin, onEdit, onLog }) {
  if (plans.length === 0) {
    return <p className="p-4 text-sm text-gray-400">Ingen vedlikehaldsplanar enno.</p>
  }

  return (
    <ul className="flex flex-col gap-3 p-4">
      {plans.map((plan) => (
        <li key={plan.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-medium text-gray-900">{plan.title}</h3>
              {plan.description && <p className="mt-0.5 text-sm text-gray-500">{plan.description}</p>}
            </div>
            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {FREQUENCY_LABELS[plan.frequency] ?? plan.frequency}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
            {plan.next_due_date && <span>Neste frist: {formatDate(plan.next_due_date)}</span>}
            {plan.last_completed_date && <span>Sist utført: {formatDate(plan.last_completed_date)}</span>}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onLog(plan)}
              className="min-h-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
            >
              Merk utført
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onEdit(plan)}
                className="min-h-9 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Rediger
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })
}

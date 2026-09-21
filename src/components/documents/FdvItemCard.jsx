export default function FdvItemCard({ item, isAdmin, onEdit }) {
  const showDescription = item.description && !isHidden(item, 'description')
  const showFile = item.file_url && !isHidden(item, 'file_url')

  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium text-gray-900">{item.title}</h3>
          {showDescription && <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>}
          {showFile && (
            <a
              href={item.file_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-brand-600 hover:underline"
            >
              Opne dokument/bilete
            </a>
          )}
          {!item.property_id && (
            <span className="mt-1 block text-xs text-gray-400">Gjeld heile bygget</span>
          )}
        </div>
        {isAdmin && (
          <div className="flex shrink-0 items-center gap-2">
            {item.visibility !== 'visible' && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {item.visibility === 'hidden' ? 'Skjult' : 'Delvis'}
              </span>
            )}
            <button
              type="button"
              onClick={() => onEdit(item)}
              className="min-h-9 rounded-lg border border-gray-300 px-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Rediger
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

function isHidden(item, field) {
  return item.visibility === 'partial' && item.hidden_fields?.includes(field)
}

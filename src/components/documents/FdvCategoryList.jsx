import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDate, formatLeaseNumber } from '../../lib/leases'
import FdvItemCard from './FdvItemCard'

export default function FdvCategoryList({ categories, items, leases, isAdmin, onEdit, onAdd }) {
  const [openKey, setOpenKey] = useState(null)
  const [openSubId, setOpenSubId] = useState(null)

  const topLevel = categories.filter((c) => c.section !== 'bygning')
  const bygning = categories.filter((c) => c.section === 'bygning')

  function itemsOf(categoryId) {
    return items.filter((i) => i.category_id === categoryId)
  }

  function renderLeases() {
    return (
      <div className="p-3">
        {leases.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">Ingen aktive leigeforhold.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {leases.map((lease) => (
              <li key={lease.id}>
                <Link
                  to={`/leigeforhold/${lease.id}`}
                  className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-brand-300"
                >
                  <span className="text-sm font-semibold text-brand-700">{formatLeaseNumber(lease.lease_number)}</span>
                  <span className="ml-2 font-medium text-gray-900">{lease.property?.name}</span>
                  <span className="block text-xs text-gray-400">Frå {formatDate(lease.start_date)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  function renderItems(category) {
    if (category.section === 'leigeforhold') return renderLeases()
    const list = itemsOf(category.id)
    return (
      <div className="p-3">
        {isAdmin && (
          <button
            type="button"
            onClick={() => onAdd(category.id)}
            className="mb-2 min-h-9 w-full rounded-lg border border-dashed border-brand-300 text-sm font-medium text-brand-600 hover:bg-brand-50"
          >
            + Legg til i {category.name}
          </button>
        )}
        {list.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">Ingenting registrert enno.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((item) => (
              <FdvItemCard key={item.id} item={item} isAdmin={isAdmin} onEdit={onEdit} />
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-2 p-4">
      {topLevel.map((category) => {
        const isOpen = openKey === category.id
        return (
          <li key={category.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Header label={category.name} isOpen={isOpen} onClick={() => setOpenKey(isOpen ? null : category.id)} />
            {isOpen && <div className="border-t border-gray-100">{renderItems(category)}</div>}
          </li>
        )
      })}

      {bygning.length > 0 && (
        <li className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <Header label="Bygning" isOpen={openKey === 'bygning'} onClick={() => setOpenKey(openKey === 'bygning' ? null : 'bygning')} />
          {openKey === 'bygning' && (
            <ul className="border-t border-gray-100 bg-gray-50 p-2">
              {bygning.map((category) => {
                const isOpen = openSubId === category.id
                return (
                  <li key={category.id} className="mb-1 overflow-hidden rounded-lg border border-gray-200 bg-white last:mb-0">
                    <Header
                      label={category.name}
                      isOpen={isOpen}
                      small
                      onClick={() => setOpenSubId(isOpen ? null : category.id)}
                    />
                    {isOpen && <div className="border-t border-gray-100">{renderItems(category)}</div>}
                  </li>
                )
              })}
            </ul>
          )}
        </li>
      )}
    </ul>
  )
}

function Header({ label, isOpen, onClick, small }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between px-4 text-left ${small ? 'min-h-11' : 'min-h-12'}`}
    >
      <span className={small ? 'text-sm font-medium text-gray-800' : 'font-medium text-gray-900'}>{label}</span>
      <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
    </button>
  )
}

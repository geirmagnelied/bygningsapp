import { useState } from 'react'
import FdvItemCard from './FdvItemCard'

export default function FdvCategoryList({ categories, items, isAdmin, onEdit, onAdd }) {
  const [openCategoryId, setOpenCategoryId] = useState(null)

  const itemsByCategory = categories.map((cat) => ({
    category: cat,
    items: items.filter((i) => i.category_id === cat.id),
  }))

  return (
    <ul className="flex flex-col gap-2 p-4">
      {itemsByCategory.map(({ category, items }) => {
        const isOpen = openCategoryId === category.id
        return (
          <li key={category.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
              className="flex min-h-12 w-full items-center justify-between px-4 text-left"
            >
              <span className="font-medium text-gray-900">{category.name}</span>
              <span className="flex items-center gap-2 text-sm text-gray-400">
                {items.length > 0 && <span>{items.length}</span>}
                <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>⌄</span>
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 p-3">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onAdd(category.id)}
                    className="mb-2 min-h-9 w-full rounded-lg border border-dashed border-brand-300 text-sm font-medium text-brand-600 hover:bg-brand-50"
                  >
                    + Legg til i {category.name}
                  </button>
                )}
                {items.length === 0 ? (
                  <p className="py-2 text-center text-sm text-gray-400">Ingenting registrert enno.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {items.map((item) => (
                      <FdvItemCard key={item.id} item={item} isAdmin={isAdmin} onEdit={onEdit} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

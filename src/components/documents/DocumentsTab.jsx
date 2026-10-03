import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useProject } from '../../contexts/ProjectContext'
import FdvCategoryList from './FdvCategoryList'
import FdvItemForm from './FdvItemForm'
import NoActiveProperty from '../shared/NoActiveProperty'

export default function DocumentsTab() {
  const { isAdmin } = useAuth()
  const { activePropertyId, activeProjectId, activeProperty, loading: projectLoading } = useProject()
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [leases, setLeases] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [addingCategoryId, setAddingCategoryId] = useState(null)

  async function load() {
    if (!activePropertyId || !activeProjectId) return
    setLoading(true)

    const [{ data: cats }, { data: leaseRows }, { data: fdvItems }] = await Promise.all([
      supabase.from('bg_fdv_categories').select('*').order('sort_order'),
      supabase
        .from('bg_leases')
        .select('id, lease_number, start_date, property:bg_properties(name)')
        .eq('property_id', activePropertyId)
        .eq('is_active', true)
        .order('lease_number'),
      supabase
        .from('bg_fdv_items')
        .select('*')
        .or(`property_id.eq.${activePropertyId},and(property_id.is.null,project_id.eq.${activeProjectId})`),
    ])

    setCategories(cats ?? [])
    setLeases(leaseRows ?? [])
    setItems(fdvItems ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [activePropertyId, activeProjectId])

  const formOpen = editingItem !== null || addingCategoryId !== null

  if (projectLoading) return <div className="p-4 text-sm text-gray-400">Lastar …</div>
  if (!activeProperty) return <NoActiveProperty />

  return (
    <div className="mx-auto max-w-2xl">
      <div className="px-4 pt-4">
        <h1 className="text-xl font-semibold text-gray-900">Dokument (FDV)</h1>
      </div>

      {loading ? (
        <p className="p-4 text-sm text-gray-400">Lastar …</p>
      ) : (
        <FdvCategoryList
          categories={categories}
          items={items}
          leases={leases}
          isAdmin={isAdmin}
          onEdit={setEditingItem}
          onAdd={setAddingCategoryId}
        />
      )}

      {formOpen && (
        <FdvItemForm
          item={editingItem}
          categories={categories.filter((c) => c.section !== 'leigeforhold')}
          defaultCategoryId={addingCategoryId}
          onClose={() => {
            setEditingItem(null)
            setAddingCategoryId(null)
          }}
          onSaved={load}
        />
      )}
    </div>
  )
}

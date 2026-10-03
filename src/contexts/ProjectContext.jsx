import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const { user, isAdmin, profile } = useAuth()
  const [properties, setProperties] = useState([])
  const [activePropertyId, setActivePropertyId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !profile) return

    async function load() {
      setLoading(true)
      if (isAdmin) {
        const { data } = await supabase
          .from('bg_properties')
          .select('id, name, unit_number, project:bg_projects(id, name, address)')
          .order('name')
        setProperties(data ?? [])
        setActivePropertyId((prev) => prev ?? data?.[0]?.id ?? null)
      } else {
        const { data } = await supabase
          .from('bg_leases')
          .select('property:bg_properties(id, name, unit_number, project:bg_projects(id, name, address))')
          .eq('is_active', true)
        // RLS gjev leigebuaren berre leigeforholda han sjølv er knytt til.
        const unique = new Map((data ?? []).map((l) => l.property).filter(Boolean).map((p) => [p.id, p]))
        const props = [...unique.values()]
        setProperties(props)
        setActivePropertyId((prev) => prev ?? props[0]?.id ?? null)
      }
      setLoading(false)
    }

    load()
  }, [user, isAdmin, profile])

  const activeProperty = properties.find((p) => p.id === activePropertyId) ?? null

  const value = {
    properties,
    activePropertyId,
    activeProperty,
    activeProjectId: activeProperty?.project?.id ?? null,
    setActivePropertyId,
    loading,
  }

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject må brukast inni ProjectProvider')
  return ctx
}

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import LeaseForm from './LeaseForm'
import ProjectForm from './ProjectForm'
import PropertyForm from './PropertyForm'

export default function TenantManagement() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [addingToProperty, setAddingToProperty] = useState(null)
  const [creatingProject, setCreatingProject] = useState(false)
  const [creatingPropertyFor, setCreatingPropertyFor] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('bg_projects')
      .select(
        'id, name, address, properties:bg_properties(id, name, unit_number, leases:bg_leases(id, start_date, is_active, tenant:bg_users(id, name, email)))',
      )
      .order('name')
    setProjects(
      (data ?? []).map((p) => ({
        ...p,
        properties: p.properties.map((prop) => ({ ...prop, leases: prop.leases.filter((l) => l.is_active) })),
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function archiveLease(lease, property) {
    if (!confirm(`Arkivera leigeforholdet til ${lease.tenant?.name}?`)) return

    await supabase.from('bg_tenant_history').insert({
      lease_id: lease.id,
      property_id: property.id,
      tenant_name: lease.tenant?.name,
      tenant_email: lease.tenant?.email,
      start_date: lease.start_date,
      end_date: new Date().toISOString().slice(0, 10),
      original_data: lease,
    })

    await supabase
      .from('bg_leases')
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        end_date: new Date().toISOString().slice(0, 10),
      })
      .eq('id', lease.id)

    await load()
  }

  if (loading) return <div className="p-4 text-sm text-gray-400">Lastar …</div>

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Bygg og leigebuarar</h1>
        <button
          type="button"
          onClick={() => setCreatingProject(true)}
          className="min-h-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
        >
          + Nytt bygg
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-gray-400">Ingen bygg registrert enno. Start med "+ Nytt bygg".</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {projects.map((project) => (
            <li key={project.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{project.name}</h2>
                  <p className="text-xs text-gray-400">{project.address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatingPropertyFor(project)}
                  className="min-h-9 rounded-lg border border-brand-300 px-3 text-sm font-medium text-brand-600 hover:bg-brand-50"
                >
                  + Leilegheit
                </button>
              </div>

              {project.properties.length === 0 ? (
                <p className="mt-3 text-sm text-gray-400">Ingen leilegheiter registrert enno.</p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {project.properties.map((property) => (
                    <li key={property.id} className="rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{property.name}</span>
                        <button
                          type="button"
                          onClick={() => setAddingToProperty(property)}
                          className="text-xs font-medium text-brand-600 hover:underline"
                        >
                          + Legg til leigebuar
                        </button>
                      </div>

                      {property.leases.length === 0 ? (
                        <p className="mt-1 text-xs text-gray-400">Ingen aktiv leigebuar.</p>
                      ) : (
                        <ul className="mt-1 flex flex-col gap-1">
                          {property.leases.map((lease) => (
                            <li key={lease.id} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">
                                {lease.tenant?.name} ({lease.tenant?.email})
                              </span>
                              <button
                                type="button"
                                onClick={() => archiveLease(lease, property)}
                                className="font-medium text-status-open hover:underline"
                              >
                                Arkiver
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {addingToProperty && (
        <LeaseForm property={addingToProperty} onClose={() => setAddingToProperty(null)} onSaved={load} />
      )}
      {creatingProject && <ProjectForm onClose={() => setCreatingProject(false)} onSaved={load} />}
      {creatingPropertyFor && (
        <PropertyForm project={creatingPropertyFor} onClose={() => setCreatingPropertyFor(null)} onSaved={load} />
      )}
    </div>
  )
}

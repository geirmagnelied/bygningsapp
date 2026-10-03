import { supabase } from './supabase'

export const ROLE_LABELS = {
  kontraktspart: 'Kontraktspart',
  kontaktperson: 'Kontaktperson',
}

export function formatLeaseNumber(n) {
  return `LF-${String(n).padStart(3, '0')}`
}

export function fullName(tenant) {
  return `${tenant?.first_name ?? ''} ${tenant?.last_name ?? ''}`.trim()
}

export function formatDate(dateStr) {
  return dateStr ? new Date(dateStr).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

export function formatMoney(amount) {
  return amount == null ? '' : `${Number(amount).toLocaleString('nb-NO')} kr`
}

// Sender invitasjons-e-post via edge-funksjonen invite-tenant (krev admin).
export async function inviteTenant(tenant) {
  const { error } = await supabase.functions.invoke('invite-tenant', {
    body: { email: tenant.email, name: fullName(tenant), redirectTo: window.location.origin },
  })
  if (!error) return { ok: true }

  const details = await error.context?.json?.().catch(() => null)
  return {
    ok: false,
    alreadyRegistered: Boolean(details?.alreadyRegistered),
    message: details?.error ?? error.message,
  }
}

// Flyttar leigeforholdet til arkivet (snapshot i bg_tenant_history) og gjer det inaktivt.
export async function archiveLease(lease, persons) {
  const today = new Date().toISOString().slice(0, 10)
  const names = persons.map((p) => fullName(p.tenant)).join(', ')
  const emails = persons.map((p) => p.tenant?.email).join(', ')

  const { error: historyError } = await supabase.from('bg_tenant_history').insert({
    lease_id: lease.id,
    property_id: lease.property_id,
    tenant_name: names,
    tenant_email: emails,
    start_date: lease.start_date,
    end_date: today,
    original_data: { lease, persons },
  })
  if (historyError) return { error: historyError }

  const { error } = await supabase
    .from('bg_leases')
    .update({ is_active: false, archived_at: new Date().toISOString(), end_date: lease.end_date ?? today })
    .eq('id', lease.id)
  return { error }
}

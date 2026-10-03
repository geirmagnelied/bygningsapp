import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Sender Supabase sin innebygde invitasjons-e-post. Berre admin (bg_users.role = 'admin') får bruke han.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return json({ error: 'Ikkje innlogga.' }, 401)

  const { data: profile } = await admin.from('bg_users').select('role').eq('id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin') return json({ error: 'Berre admin kan invitere.' }, 403)

  const { email, name, redirectTo } = await req.json().catch(() => ({}))
  if (typeof email !== 'string' || !email.includes('@')) return json({ error: 'Ugyldig e-postadresse.' }, 400)

  const { error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    redirectTo,
    data: { name },
  })
  if (error) {
    const alreadyRegistered = /already been registered|already registered/i.test(error.message)
    return json({ error: error.message, alreadyRegistered }, alreadyRegistered ? 409 : 400)
  }

  return json({ ok: true })
})

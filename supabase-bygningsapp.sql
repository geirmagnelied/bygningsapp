-- ============================================
-- BYGNINGSAPP — Database-skjema (prefiks bg_)
-- Trygt å køyra fleire gonger.
-- ============================================

-- Prosjekt/adresser (bygg)
CREATE TABLE IF NOT EXISTS bg_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  gardsnr TEXT,
  bruksnr TEXT,
  seksjonsnr TEXT,
  purchase_date DATE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Oppgradering for databasar som alt har bg_projects utan dei nye felta
ALTER TABLE bg_projects ADD COLUMN IF NOT EXISTS seksjonsnr TEXT;
ALTER TABLE bg_projects ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE bg_projects ADD COLUMN IF NOT EXISTS description TEXT;

-- Leilegheiter/einingar under eit prosjekt (eigedom)
CREATE TABLE IF NOT EXISTS bg_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bg_projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_number TEXT,
  status TEXT DEFAULT 'active', -- active | under_construction
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Brukarprofilar (kopla til Supabase Auth via id)
CREATE TABLE IF NOT EXISTS bg_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'tenant', -- admin | tenant
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leigebuarar (kontaktinfo registrert av admin). user_id vert kopla til innloggingskontoen
-- automatisk (bg_link_tenants) når leigebuaren registrerer seg med same e-post.
CREATE TABLE IF NOT EXISTS bg_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  user_id UUID REFERENCES bg_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bg_tenants_email_key ON bg_tenants (lower(email));

-- Globalt løpenummer for leigeforhold (uavhengig av leilegheit). Vist som LF-001 i appen.
CREATE SEQUENCE IF NOT EXISTS bg_lease_number_seq START 1;

-- Leigeforhold — avtale for ei leilegheit i ein periode
CREATE TABLE IF NOT EXISTS bg_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_number INT NOT NULL DEFAULT nextval('bg_lease_number_seq'),
  property_id UUID REFERENCES bg_properties(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  monthly_rent NUMERIC(10,2),
  deposit NUMERIC(10,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bg_leases_lease_number_key ON bg_leases (lease_number);

-- Personar (kontraktspartar/kontaktpersonar) på eit leigeforhold
CREATE TABLE IF NOT EXISTS bg_lease_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES bg_leases(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES bg_tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'kontraktspart', -- kontraktspart | kontaktperson
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (lease_id, tenant_id)
);

-- Dokument (t.d. signert kontrakt); filene ligg i den private bucketen bygningsapp-private
CREATE TABLE IF NOT EXISTS bg_lease_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES bg_leases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES bg_users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Oppgradering frå eldre versjonar av skjemaet (ein leigebuar per leigeforhold, ingen løpenummer)
ALTER TABLE bg_leases ADD COLUMN IF NOT EXISTS lease_number INT DEFAULT nextval('bg_lease_number_seq');
ALTER TABLE bg_leases ALTER COLUMN lease_number SET NOT NULL;
ALTER TABLE bg_leases ADD COLUMN IF NOT EXISTS monthly_rent NUMERIC(10,2);
ALTER TABLE bg_leases ADD COLUMN IF NOT EXISTS deposit NUMERIC(10,2);
ALTER TABLE bg_leases ADD COLUMN IF NOT EXISTS notes TEXT;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bg_leases' AND column_name = 'tenant_contact_id') THEN
    INSERT INTO bg_lease_persons (lease_id, tenant_id)
      SELECT id, tenant_contact_id FROM bg_leases WHERE tenant_contact_id IS NOT NULL
      ON CONFLICT DO NOTHING;
  END IF;
END $$;
DROP POLICY IF EXISTS bg_leases_tenant_read ON bg_leases;
ALTER TABLE bg_leases DROP COLUMN IF EXISTS tenant_contact_id;
ALTER TABLE bg_leases DROP COLUMN IF EXISTS tenant_id;

-- Arkiv for avslutta leigeforhold (snapshot av data)
CREATE TABLE IF NOT EXISTS bg_tenant_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID,
  property_id UUID,
  tenant_name TEXT,
  tenant_email TEXT,
  start_date DATE,
  end_date DATE,
  archived_at TIMESTAMPTZ DEFAULT now(),
  original_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- FDV-kategoriar. section: leigeforhold | tegningar | bileter er eigne toppnivå-kategoriar,
-- bygning samlar alle bygningsdelane (og Kontrakt og juridisk) under ein utvidbar "Bygning".
CREATE TABLE IF NOT EXISTS bg_fdv_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0
);
ALTER TABLE bg_fdv_categories ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT 'bygning';

INSERT INTO bg_fdv_categories (name, section, sort_order) VALUES
  ('Leigeforhold', 'leigeforhold', 1),
  ('Tegningar', 'tegningar', 2),
  ('Bileter', 'bileter', 3),
  ('Grunn og fundament', 'bygning', 11),
  ('Yttervegg', 'bygning', 12),
  ('Tak', 'bygning', 13),
  ('Dører og vindauge', 'bygning', 14),
  ('Innvendige overflater', 'bygning', 15),
  ('Våtrom', 'bygning', 16),
  ('Elektro', 'bygning', 17),
  ('VVS (varme/vann/sanitær)', 'bygning', 18),
  ('Ventilasjon', 'bygning', 19),
  ('Fast inventar', 'bygning', 20),
  ('Løst inventar', 'bygning', 21),
  ('Utomhus', 'bygning', 22),
  ('Forsikring', 'bygning', 23),
  ('Kontrakt og juridisk', 'bygning', 24),
  ('Anna', 'bygning', 25)
ON CONFLICT (name) DO UPDATE SET section = EXCLUDED.section, sort_order = EXCLUDED.sort_order;

-- FDV-informasjon (dokument/data)
CREATE TABLE IF NOT EXISTS bg_fdv_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bg_projects(id) ON DELETE CASCADE,
  property_id UUID REFERENCES bg_properties(id) ON DELETE CASCADE, -- NULL = felles for heile prosjektet
  category_id UUID REFERENCES bg_fdv_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'visible', -- visible | hidden | partial
  hidden_fields JSONB DEFAULT '[]', -- kva felt som er skjult ved 'partial'
  created_by UUID REFERENCES bg_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vedlikehaldsplaner
CREATE TABLE IF NOT EXISTS bg_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bg_projects(id) ON DELETE CASCADE,
  property_id UUID REFERENCES bg_properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'yearly', -- weekly | monthly | yearly | custom
  next_due_date DATE,
  last_completed_date DATE,
  is_recurring BOOLEAN DEFAULT true,
  created_by UUID REFERENCES bg_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vedlikehaldslogg (historikk, både admin og leigebuar kan logga)
CREATE TABLE IF NOT EXISTS bg_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_plan_id UUID REFERENCES bg_maintenance_plans(id) ON DELETE CASCADE,
  property_id UUID REFERENCES bg_properties(id),
  completed_by UUID REFERENCES bg_users(id),
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Feilrapportar / saker
CREATE TABLE IF NOT EXISTS bg_error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE,
  property_id UUID REFERENCES bg_properties(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES bg_users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  severity TEXT NOT NULL DEFAULT 'normal', -- urgent | normal
  suggested_deadline DATE,
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
  assigned_to UUID REFERENCES bg_users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Saksnummer-sekvens (brukast til å generera CASE-2026-001 osv.)
CREATE SEQUENCE IF NOT EXISTS bg_case_number_seq START 1;

-- Returnerer neste ferdig formaterte saksnummer, t.d. CASE-2026-001
CREATE OR REPLACE FUNCTION bg_next_case_number() RETURNS TEXT AS $$
  SELECT 'CASE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('bg_case_number_seq')::TEXT, 3, '0');
$$ LANGUAGE sql;

-- Meldingar i ei sak (open for alle involverte: leigebuar + admin)
CREATE TABLE IF NOT EXISTS bg_case_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES bg_error_reports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES bg_users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Meldingskanal per prosjekt/adresse (admin → alle leigebuarar på adressa)
CREATE TABLE IF NOT EXISTS bg_channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES bg_projects(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES bg_users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- RLS (Row Level Security) — isolasjon frå LiedLab + rollebasert tilgang
-- ============================================

ALTER TABLE bg_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_lease_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_lease_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_tenant_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_fdv_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_fdv_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_case_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bg_channel_messages ENABLE ROW LEVEL SECURITY;

-- Hjelpefunksjon: er innlogga brukar admin?
CREATE OR REPLACE FUNCTION bg_is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bg_users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Hjelpefunksjon: har innlogga brukar aktivt leigeforhold på denne property_id?
CREATE OR REPLACE FUNCTION bg_has_active_lease(pid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bg_leases l
    JOIN bg_lease_persons lp ON lp.lease_id = l.id
    JOIN bg_tenants t ON t.id = lp.tenant_id
    WHERE l.property_id = pid AND l.is_active = true AND t.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Har innlogga brukar tilgang til dette (aktive) leigeforholdet?
CREATE OR REPLACE FUNCTION bg_has_lease_access(lid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bg_leases l
    JOIN bg_lease_persons lp ON lp.lease_id = l.id
    JOIN bg_tenants t ON t.id = lp.tenant_id
    WHERE l.id = lid AND l.is_active = true AND t.user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Kan innlogga brukar sjå denne leigebuaren (sjølv eller på same leigeforhold)?
CREATE OR REPLACE FUNCTION bg_tenant_visible(tid UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM bg_lease_persons lp WHERE lp.tenant_id = tid AND bg_has_lease_access(lp.lease_id)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Fil-tilgang i privat bucket (sti: <lease_id>/<fil>): admin, eller brukar på leigeforholdet
CREATE OR REPLACE FUNCTION bg_can_read_lease_file(p TEXT) RETURNS BOOLEAN AS $$
  SELECT bg_is_admin() OR CASE
    WHEN split_part(p, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN bg_has_lease_access(split_part(p, '/', 1)::uuid)
    ELSE false
  END;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Koplar leigebuarar (registrert av admin) til innloggingskontoar med same, stadfesta e-post.
-- Vanleg brukar kan berre kopla seg sjølv; admin kan kopla alle.
CREATE OR REPLACE FUNCTION bg_link_tenants() RETURNS void AS $$
  UPDATE bg_tenants t SET user_id = u.id, updated_at = now()
  FROM auth.users u
  JOIN bg_users bu ON bu.id = u.id
  WHERE t.user_id IS NULL
    AND lower(u.email) = lower(t.email)
    AND u.email_confirmed_at IS NOT NULL
    AND (u.id = auth.uid() OR bg_is_admin());
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Enkle policy-mønster: admin har full tilgang overalt.
-- Leigebuar ser berre data knytt til eiga(ne) aktive leilegheit(er), og berre synlege FDV-postar.

DROP POLICY IF EXISTS bg_projects_admin_all ON bg_projects;
CREATE POLICY bg_projects_admin_all ON bg_projects FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_projects_tenant_read ON bg_projects;
CREATE POLICY bg_projects_tenant_read ON bg_projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM bg_properties p WHERE p.project_id = bg_projects.id AND bg_has_active_lease(p.id))
);

DROP POLICY IF EXISTS bg_properties_admin_all ON bg_properties;
CREATE POLICY bg_properties_admin_all ON bg_properties FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_properties_tenant_read ON bg_properties;
CREATE POLICY bg_properties_tenant_read ON bg_properties FOR SELECT USING (bg_has_active_lease(id));

DROP POLICY IF EXISTS bg_users_admin_all ON bg_users;
CREATE POLICY bg_users_admin_all ON bg_users FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_users_self_read ON bg_users;
CREATE POLICY bg_users_self_read ON bg_users FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS bg_users_self_update ON bg_users;
CREATE POLICY bg_users_self_update ON bg_users FOR UPDATE USING (id = auth.uid());
-- Lèt ein fersk auth-brukar oppretta si eiga bg_users-rad ved sjølvregistrering
DROP POLICY IF EXISTS bg_users_self_insert ON bg_users;
CREATE POLICY bg_users_self_insert ON bg_users FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS bg_leases_admin_all ON bg_leases;
CREATE POLICY bg_leases_admin_all ON bg_leases FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_leases_tenant_read ON bg_leases;
CREATE POLICY bg_leases_tenant_read ON bg_leases FOR SELECT USING (is_active = true AND bg_has_lease_access(id));

DROP POLICY IF EXISTS bg_lease_persons_admin_all ON bg_lease_persons;
CREATE POLICY bg_lease_persons_admin_all ON bg_lease_persons FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_lease_persons_tenant_read ON bg_lease_persons;
CREATE POLICY bg_lease_persons_tenant_read ON bg_lease_persons FOR SELECT USING (bg_has_lease_access(lease_id));

DROP POLICY IF EXISTS bg_lease_documents_admin_all ON bg_lease_documents;
CREATE POLICY bg_lease_documents_admin_all ON bg_lease_documents FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_lease_documents_tenant_read ON bg_lease_documents;
CREATE POLICY bg_lease_documents_tenant_read ON bg_lease_documents FOR SELECT USING (bg_has_lease_access(lease_id));

DROP POLICY IF EXISTS bg_tenants_admin_all ON bg_tenants;
CREATE POLICY bg_tenants_admin_all ON bg_tenants FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_tenants_self_read ON bg_tenants;
CREATE POLICY bg_tenants_self_read ON bg_tenants FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS bg_tenants_housemates_read ON bg_tenants;
CREATE POLICY bg_tenants_housemates_read ON bg_tenants FOR SELECT USING (bg_tenant_visible(id));

-- Privat bucket for kontraktar (ikkje offentleg - tilgang via signerte lenkjer)
INSERT INTO storage.buckets (id, name, public) VALUES ('bygningsapp-private', 'bygningsapp-private', false)
  ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "bg private read" ON storage.objects;
CREATE POLICY "bg private read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'bygningsapp-private' AND bg_can_read_lease_file(name));
DROP POLICY IF EXISTS "bg private admin insert" ON storage.objects;
CREATE POLICY "bg private admin insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'bygningsapp-private' AND bg_is_admin());
DROP POLICY IF EXISTS "bg private admin delete" ON storage.objects;
CREATE POLICY "bg private admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'bygningsapp-private' AND bg_is_admin());

DROP POLICY IF EXISTS bg_tenant_history_admin_all ON bg_tenant_history;
CREATE POLICY bg_tenant_history_admin_all ON bg_tenant_history FOR ALL USING (bg_is_admin());

DROP POLICY IF EXISTS bg_fdv_categories_read_all ON bg_fdv_categories;
CREATE POLICY bg_fdv_categories_read_all ON bg_fdv_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS bg_fdv_categories_admin_write ON bg_fdv_categories;
CREATE POLICY bg_fdv_categories_admin_write ON bg_fdv_categories FOR INSERT WITH CHECK (bg_is_admin());

DROP POLICY IF EXISTS bg_fdv_items_admin_all ON bg_fdv_items;
CREATE POLICY bg_fdv_items_admin_all ON bg_fdv_items FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_fdv_items_tenant_read ON bg_fdv_items;
CREATE POLICY bg_fdv_items_tenant_read ON bg_fdv_items FOR SELECT USING (
  visibility != 'hidden' AND (
    (property_id IS NOT NULL AND bg_has_active_lease(property_id))
    OR (property_id IS NULL AND EXISTS (
      SELECT 1 FROM bg_properties p WHERE p.project_id = bg_fdv_items.project_id AND bg_has_active_lease(p.id)
    ))
  )
);

DROP POLICY IF EXISTS bg_maint_plans_admin_all ON bg_maintenance_plans;
CREATE POLICY bg_maint_plans_admin_all ON bg_maintenance_plans FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_maint_plans_tenant_read ON bg_maintenance_plans;
CREATE POLICY bg_maint_plans_tenant_read ON bg_maintenance_plans FOR SELECT USING (bg_has_active_lease(property_id));
-- Lèt leigebuar oppdatera last_completed_date/next_due_date når dei loggar utført vedlikehald
DROP POLICY IF EXISTS bg_maint_plans_tenant_update ON bg_maintenance_plans;
CREATE POLICY bg_maint_plans_tenant_update ON bg_maintenance_plans FOR UPDATE USING (bg_has_active_lease(property_id));

DROP POLICY IF EXISTS bg_maint_logs_admin_all ON bg_maintenance_logs;
CREATE POLICY bg_maint_logs_admin_all ON bg_maintenance_logs FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_maint_logs_tenant_read ON bg_maintenance_logs;
CREATE POLICY bg_maint_logs_tenant_read ON bg_maintenance_logs FOR SELECT USING (bg_has_active_lease(property_id));
DROP POLICY IF EXISTS bg_maint_logs_tenant_insert ON bg_maintenance_logs;
CREATE POLICY bg_maint_logs_tenant_insert ON bg_maintenance_logs FOR INSERT WITH CHECK (bg_has_active_lease(property_id));

DROP POLICY IF EXISTS bg_error_reports_admin_all ON bg_error_reports;
CREATE POLICY bg_error_reports_admin_all ON bg_error_reports FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_error_reports_tenant_read ON bg_error_reports;
CREATE POLICY bg_error_reports_tenant_read ON bg_error_reports FOR SELECT USING (bg_has_active_lease(property_id));
DROP POLICY IF EXISTS bg_error_reports_tenant_insert ON bg_error_reports;
CREATE POLICY bg_error_reports_tenant_insert ON bg_error_reports FOR INSERT WITH CHECK (bg_has_active_lease(property_id));

DROP POLICY IF EXISTS bg_case_messages_admin_all ON bg_case_messages;
CREATE POLICY bg_case_messages_admin_all ON bg_case_messages FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_case_messages_tenant_read ON bg_case_messages;
CREATE POLICY bg_case_messages_tenant_read ON bg_case_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM bg_error_reports r WHERE r.id = bg_case_messages.case_id AND bg_has_active_lease(r.property_id))
);
DROP POLICY IF EXISTS bg_case_messages_tenant_insert ON bg_case_messages;
CREATE POLICY bg_case_messages_tenant_insert ON bg_case_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM bg_error_reports r WHERE r.id = bg_case_messages.case_id AND bg_has_active_lease(r.property_id))
);

DROP POLICY IF EXISTS bg_channel_messages_admin_all ON bg_channel_messages;
CREATE POLICY bg_channel_messages_admin_all ON bg_channel_messages FOR ALL USING (bg_is_admin());
DROP POLICY IF EXISTS bg_channel_messages_tenant_read ON bg_channel_messages;
CREATE POLICY bg_channel_messages_tenant_read ON bg_channel_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM bg_properties p WHERE p.project_id = bg_channel_messages.project_id AND bg_has_active_lease(p.id))
);

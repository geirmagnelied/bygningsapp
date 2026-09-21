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
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leilegheiter/einingar under eit prosjekt
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

-- Leigeforhold — koplar brukar til leilegheit i ein periode
CREATE TABLE IF NOT EXISTS bg_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES bg_properties(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES bg_users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- FDV-kategoriar (bygningsdeltabell + eigne kategoriar)
CREATE TABLE IF NOT EXISTS bg_fdv_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0
);

INSERT INTO bg_fdv_categories (name, sort_order) VALUES
  ('Grunn og fundament', 1),
  ('Yttervegg', 2),
  ('Tak', 3),
  ('Dører og vindauge', 4),
  ('Innvendige overflater', 5),
  ('Våtrom', 6),
  ('Elektro', 7),
  ('VVS (varme/vann/sanitær)', 8),
  ('Ventilasjon', 9),
  ('Løst inventar', 10),
  ('Utomhus', 11),
  ('Forsikring', 12),
  ('Kontrakt og juridisk', 13),
  ('Anna', 14)
ON CONFLICT (name) DO NOTHING;

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
    SELECT 1 FROM bg_leases
    WHERE property_id = pid AND tenant_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

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
CREATE POLICY bg_leases_tenant_read ON bg_leases FOR SELECT USING (tenant_id = auth.uid() AND is_active = true);

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

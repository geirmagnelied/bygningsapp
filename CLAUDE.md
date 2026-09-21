# CLAUDE.md — Bygningsapp

Dette er prosjektinstruksjonen for Claude Code. Les heile fila før du startar, og bygg appen steg for steg slik det er beskrive under. Spør **ikkje** brukaren om avklaringar som allereie er svart her — ta sjølvstendige, fornuftige val og dokumenter dei i kommentarar/commits.

---

## Formål

Bygningsapp er ein web- og mobilapp (responsivt design, mobil-først) for ein privat bygningseigar (Geir Magne) som administrerer nokre få bygg/leilegheiter. Appen fungerer som:
1. **Infoboks og kommunikasjonskanal** mellom eigar (admin) og leigebuarar
2. **FDV-register** (Forvaltning, Drift, Vedlikehald) med granular synlegskontroll
3. **Feilrapporterings- og sakshandsamingssystem**
4. **Vedlikehaldsplanleggar** med historikk

Målgruppe: ca. 10 brukarar totalt (2 admin, resten leigebuarar). Enkelt, robust, lettlese grensesnitt med god kontrast og friskt design.

---

## Teknisk stack (bestemt — ikkje til diskusjon)

- **Frontend:** React + Vite (alt initialisert i repoet)
- **Styling:** Tailwind CSS (installer om ikkje alt gjort — `npm install -D tailwindcss postcss autoprefixer`)
- **Routing:** react-router-dom (alt installert)
- **Backend/DB:** Supabase (delt prosjekt med LiedLab: `hcdtagtkyewhrbrvrbqh.supabase.co`) — **alle tabellar i denne appen MÅ prefiksast med `bg_`** for å isolera frå LiedLab sine tabellar
- **Auth:** Supabase Auth (email/passord er tilstrekkeleg til å starta)
- **Fil-opplasting:** Supabase Storage (eige bucket: `bygningsapp-files`)
- **Hosting:** Vercel, eige prosjekt kopla til GitHub-repoet `geirmagnelied/bygningsapp`
- **Miljøvariablar:** ligg alt i `.env.local` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

---

## Datamodell — SQL-skript

Lag ein fil `supabase-bygningsapp.sql` i rotmappa med heile skjemaet under. Dette skal brukaren sjølv køyra i Supabase SQL Editor (det er det einaste databasesteget brukaren treng å gjera manuelt). Skriptet skal vera trygt å køyra fleire gonger (bruk `IF NOT EXISTS`).

```sql
-- ============================================
-- BYGNINGSAPP — Database-skjema (prefiks bg_)
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

CREATE POLICY bg_projects_admin_all ON bg_projects FOR ALL USING (bg_is_admin());
CREATE POLICY bg_projects_tenant_read ON bg_projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM bg_properties p WHERE p.project_id = bg_projects.id AND bg_has_active_lease(p.id))
);

CREATE POLICY bg_properties_admin_all ON bg_properties FOR ALL USING (bg_is_admin());
CREATE POLICY bg_properties_tenant_read ON bg_properties FOR SELECT USING (bg_has_active_lease(id));

CREATE POLICY bg_users_admin_all ON bg_users FOR ALL USING (bg_is_admin());
CREATE POLICY bg_users_self_read ON bg_users FOR SELECT USING (id = auth.uid());
CREATE POLICY bg_users_self_update ON bg_users FOR UPDATE USING (id = auth.uid());

CREATE POLICY bg_leases_admin_all ON bg_leases FOR ALL USING (bg_is_admin());
CREATE POLICY bg_leases_tenant_read ON bg_leases FOR SELECT USING (tenant_id = auth.uid() AND is_active = true);

CREATE POLICY bg_tenant_history_admin_all ON bg_tenant_history FOR ALL USING (bg_is_admin());

CREATE POLICY bg_fdv_categories_read_all ON bg_fdv_categories FOR SELECT USING (true);
CREATE POLICY bg_fdv_categories_admin_write ON bg_fdv_categories FOR INSERT WITH CHECK (bg_is_admin());

CREATE POLICY bg_fdv_items_admin_all ON bg_fdv_items FOR ALL USING (bg_is_admin());
CREATE POLICY bg_fdv_items_tenant_read ON bg_fdv_items FOR SELECT USING (
  visibility != 'hidden' AND (
    (property_id IS NOT NULL AND bg_has_active_lease(property_id))
    OR (property_id IS NULL AND EXISTS (
      SELECT 1 FROM bg_properties p WHERE p.project_id = bg_fdv_items.project_id AND bg_has_active_lease(p.id)
    ))
  )
);

CREATE POLICY bg_maint_plans_admin_all ON bg_maintenance_plans FOR ALL USING (bg_is_admin());
CREATE POLICY bg_maint_plans_tenant_read ON bg_maintenance_plans FOR SELECT USING (bg_has_active_lease(property_id));

CREATE POLICY bg_maint_logs_admin_all ON bg_maintenance_logs FOR ALL USING (bg_is_admin());
CREATE POLICY bg_maint_logs_tenant_read ON bg_maintenance_logs FOR SELECT USING (bg_has_active_lease(property_id));
CREATE POLICY bg_maint_logs_tenant_insert ON bg_maintenance_logs FOR INSERT WITH CHECK (bg_has_active_lease(property_id));

CREATE POLICY bg_error_reports_admin_all ON bg_error_reports FOR ALL USING (bg_is_admin());
CREATE POLICY bg_error_reports_tenant_read ON bg_error_reports FOR SELECT USING (bg_has_active_lease(property_id));
CREATE POLICY bg_error_reports_tenant_insert ON bg_error_reports FOR INSERT WITH CHECK (bg_has_active_lease(property_id));

CREATE POLICY bg_case_messages_admin_all ON bg_case_messages FOR ALL USING (bg_is_admin());
CREATE POLICY bg_case_messages_tenant_read ON bg_case_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM bg_error_reports r WHERE r.id = bg_case_messages.case_id AND bg_has_active_lease(r.property_id))
);
CREATE POLICY bg_case_messages_tenant_insert ON bg_case_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM bg_error_reports r WHERE r.id = bg_case_messages.case_id AND bg_has_active_lease(r.property_id))
);

CREATE POLICY bg_channel_messages_admin_all ON bg_channel_messages FOR ALL USING (bg_is_admin());
CREATE POLICY bg_channel_messages_tenant_read ON bg_channel_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM bg_properties p WHERE p.project_id = bg_channel_messages.project_id AND bg_has_active_lease(p.id))
);
```

**Merk til Claude Code:** Ikkje forsøk å køyra dette SQL-et sjølv mot Supabase (nettverkstilgang til `*.supabase.co` er sperra i skyarbeidsflata, sjå `claude/notatapp-oppsett.md`-mønsteret frå søsterprosjektet LiedLab). Lag fila, forklar i README at brukaren må lima ho inn i Supabase SQL Editor og køyra — det er einaste manuelle databasesteget.

---

## Saksnummer-generering

Ved oppretting av ny feilrapport, generer saksnummer i appkoden (ikkje i databasen) på forma `CASE-2026-001`, ved å henta neste verdi frå `bg_case_number_seq` og formatera med inneverande år og 3-sifra løpenummer, t.d.:

```js
const { data } = await supabase.rpc('nextval', { seq: 'bg_case_number_seq' })
// eller ein enkel Postgres-funksjon som returnerer ferdig formatert streng
```

Lag heller ein Postgres-funksjon `bg_next_case_number()` som returnerer ferdig formatert tekst (t.d. `CASE-2026-001`), og legg henne til i SQL-skriptet over. Kall denne funksjonen frå frontend ved oppretting.

---

## Appstruktur (komponentar/sider)

```
src/
  lib/
    supabase.js          # Supabase-klient (les frå .env)
  contexts/
    AuthContext.jsx       # Innlogga brukar, rolle, aktivt prosjekt
  components/
    layout/
      TopBar.jsx           # Prosjektveljar (desktop, øverst)
      StatusBar.jsx         # Tjukk statusfane (mobil, øverst) — opne saker, komande vedlikehald
      TabNav.jsx            # Fanenavigasjon (mobil: nedst, desktop: nedst eller sidemeny)
    dashboard/
      Dashboard.jsx
      ChannelFeed.jsx        # Meldingskanal per adresse
      ErrorReportButton.jsx  # "Varsle om feil"-knapp → opnar flyt
      ErrorReportModal.jsx   # Skjema: beskriving, frist, bilete, hastar/kan vente
      UpcomingMaintenance.jsx
    maintenance/
      MaintenanceTab.jsx
      MaintenancePlanList.jsx
      MaintenancePlanForm.jsx   # admin: opprett/rediger plan
      MaintenanceLogForm.jsx    # leigebuar: merk utført
    documents/
      DocumentsTab.jsx
      FdvCategoryList.jsx
      FdvItemForm.jsx        # admin: legg til/rediger, vel synlegskap
      FdvItemCard.jsx
    cases/
      CaseDetail.jsx          # sak-kanal med meldingar + statusendring (admin)
      CaseList.jsx
    admin/
      AdminDashboard.jsx      # alle saker/prosjekt på tvers
      TenantManagement.jsx    # legg til/arkiver leigebuarar
      LeaseForm.jsx
    settings/
      SettingsTab.jsx
    auth/
      LoginPage.jsx
  pages/
    App.jsx                  # rot, routing
  App.css / index.css        # Tailwind + design tokens
```

## Roller og rute-beskyttelse

- Uinnlogga brukar → `LoginPage`
- Innlogga med rolle `tenant` → ser Dashboard/Vedlikehald/Dokument/Innstillingar for **sitt** aktive leigeforhold. Ingen prosjektveljar om berre éin aktiv leilegheit; syn veljar dersom fleire (sjeldan, men støtt det).
- Innlogga med rolle `admin` → ser same fanestruktur PLUSS eit "Admin"-ikon/fane som opnar `AdminDashboard`, `TenantManagement`. Har alltid full prosjektveljar øverst (alle prosjekt/bygg).

## Design

- Fargepalett: friskt, lys bakgrunn, god kontrast (unngå lys grå tekst på lys bakgrunn). Bruk t.d. ein hovudfarge (blågrøn/teal i tråd med LiedLab sin kalendermodul `#2A9D8F`), status-fargar: raud/oransje for "open"/"urgent", gul for "in_progress", grøn for "resolved/closed".
- Store, lettklikka knappar (mobil-først — minimum 44px høgd på touch-mål).
- Statusar vist som fargekoda badges, ikkje berre tekst.
- Skrift: minimum 15–16px brødtekst for lesbarheit.

## Mobil-layout (viktig, sjå tidlegare avklaring)

- **Øverst:** Tjukk statusfane — viser tal opne saker, neste vedlikehald, ulesne meldingar. Klikkbar → hoppar til relevant fane.
- **Nedst:** Fanevelgar (Dashboard / Vedlikehald / Dokument / Innstillingar, + Admin-ikon for adminrolle).

## Desktop-layout

- **Øverst:** Prosjektveljar + logo/appnamn.
- **Fanenavigasjon:** kan liggja som ein rad rett under toppen, eller som sidemeny — Claude Code vel det som passar best med Tailwind-oppsettet, konsistent med resten av design.

---

## Implementasjonsrekkefølgje (jobb sjølvstendig gjennom desse fasane, commit etter kvar fase)

1. **Tailwind-oppsett** + design tokens (fargar, typografi) i `index.css`
2. **Supabase-klient** (`lib/supabase.js`) + `supabase-bygningsapp.sql`-fila (for brukaren å køyra manuelt)
3. **Auth-flyt**: LoginPage, AuthContext (hentar `bg_users`-rad + rolle etter innlogging)
4. **Layout-skjelett**: TopBar, StatusBar, TabNav, routing mellom faner (tomme placeholder-sider først)
5. **Dashboard**: ChannelFeed (les/skriv meldingar), UpcomingMaintenance, ErrorReportButton + ErrorReportModal (full flyt med saksnummer-generering og biletopplasting til Supabase Storage)
6. **Vedlikehald-fane**: liste over planar, admin kan oppretta/redigera, leigebuar kan logga utført vedlikehald
7. **Dokument-fane**: FDV-kategoriliste, admin kan leggja til/redigera med synlegskapsval (visible/hidden/partial), leigebuar ser berre det som er tillate
8. **Saker/Cases**: CaseList + CaseDetail med meldingstråd og statusendring (admin)
9. **Admin-dashboard**: samla oversikt på tvers av prosjekt (opne saker, komande vedlikehald, leigeforhold)
10. **Tenant management**: admin legg til leigebuar (opprettar `bg_users` + `bg_leases`), arkiverer leigeforhold (flyttar til `bg_tenant_history`, set `is_active=false`)
11. **Innstillingar**: varsling på/av (oppdaterer `bg_users.notifications_enabled`)
12. **Polish**: tomme tilstandar, feilhandtering, loading states, responsivt finish
13. **README-oppdatering**: skriv tydeleg kva brukaren må gjera manuelt (SQL-skript, Supabase Storage-bucket, Vercel-miljøvariablar, domeneoppsett)

---

## Kva brukaren (Geir Magne) må gjera manuelt — hald denne lista kort og oppdatert i README.md

1. Køyra `supabase-bygningsapp.sql` i Supabase SQL Editor (éin gong)
2. Oppretta Storage-bucket `bygningsapp-files` i Supabase (public read, authenticated write) — gi eksakt oppskrift i README
3. Oppretta minst éin admin-brukar manuelt (registrera via Supabase Auth, deretter sett `role='admin'` på tilhøyrande `bg_users`-rad via SQL Editor) — gi eksakt SQL i README
4. Kopla GitHub-repoet til Vercel og setja miljøvariablane (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
5. DNS: peika `bygningsapp.liedlab.no` til Vercel (CNAME) — berre om han ønskjer eige subdomene med det same

Alt anna (kode, struktur, styling, logikk) skal Claude Code gjera sjølvstendig.

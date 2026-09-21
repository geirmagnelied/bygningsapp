# Bygningsapp

Ein web- og mobilapp (responsivt, mobil-først) for ein privat bygningseigar som administrerer nokre få bygg/leilegheiter. Appen fungerer som infoboks/kommunikasjonskanal mellom eigar (admin) og leigebuarar, FDV-register (Forvaltning, Drift, Vedlikehald), feilrapporterings-/sakshandsamingssystem og vedlikehaldsplanleggar med historikk.

React + Vite + Tailwind CSS, Supabase som backend (delt prosjekt med LiedLab, isolert med `bg_`-prefiks på alle tabellar).

## Kommandoar

```bash
npm install
npm run dev      # Start dev-server på http://localhost:5173
npm run build    # Bygg for produksjon
npm run lint     # oxlint
npm run preview  # Førehandsvis produksjonsbuild lokalt
```

## Kva du (Geir Magne) må gjera manuelt

Alt anna (kode, struktur, styling, logikk) er bygd ferdig av Claude Code. Desse stega må du gjera sjølv, éin gong:

1. **Køyr databaseskjemaet.** Opne `supabase-bygningsapp.sql` i dette repoet, lim heile innhaldet inn i **Supabase SQL Editor** (prosjektet "Lied Lab") og køyr det. Skriptet oppretter alle `bg_*`-tabellar, RLS-policyar og hjelpefunksjonar. Det er trygt å køyra fleire gonger dersom du gjer endringar seinare.

2. **Opprett Storage-bucket.** I Supabase → Storage, lag ein ny bucket med namnet **`bygningsapp-files`**:
   - Public: **på** (slik at bilete/dokument kan visast direkte via lenkje)
   - Legg til ein policy som let innlogga brukarar (`authenticated`) lasta opp filer (`INSERT`), t.d.:
     ```sql
     CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT TO authenticated
       WITH CHECK (bucket_id = 'bygningsapp-files');
     CREATE POLICY "Public read" ON storage.objects FOR SELECT
       USING (bucket_id = 'bygningsapp-files');
     ```

3. **Opprett din eigen admin-brukar.**
   - Registrer deg som vanleg brukar i appen (LoginPage → "Registrer deg") med din eigen e-post/passord. Dette oppretter både ein `auth.users`-rad og ein `bg_users`-rad med rolle `tenant`.
   - Gå så til Supabase SQL Editor og kjør, med din e-post:
     ```sql
     UPDATE bg_users SET role = 'admin' WHERE email = 'din@epost.no';
     ```
   - Logg ut og inn att i appen for at rolla skal ta effekt.

4. **Opprett bygg og leilegheiter.** Logga inn som admin → fana **Admin** → **Leigebuarar** → "+ Nytt bygg" og "+ Leilegheit". Leigebuarar registrerer seg sjølve i appen (steg 3, utan admin-oppgraderinga), og du koplar dei til rett leilegheit med "+ Legg til leigebuar" ved å oppgje e-posten deira.

5. **Kopla til Vercel.**
   - Nytt Vercel-prosjekt kopla til GitHub-repoet `geirmagnelied/bygningsapp`
   - Miljøvariablar (same som i `.env.local`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Deploy

6. **DNS (valfritt).** Om du ønskjer eige subdomene med det same, peik `bygningsapp.liedlab.no` til Vercel (CNAME).

## Teknisk merknad om leigebuar-oppretting

Klienten har berre den offentlege anon-nøkkelen (ingen service-role-nøkkel), så admin kan ikkje oppretta Supabase Auth-kontoar for andre direkte frå nettlesaren — det ville kapra admin sin eigen innlogga sesjon. Difor registrerer kvar leigebuar seg sjølv (same skjema som steg 3 over, utan rolle-oppgraderinga), og admin koplar dei til rett leilegheit i etterkant via **Admin → Leigebuarar**.

## Struktur

```
src/
  lib/            # Supabase-klient, storage-opplasting, vedlikehaldslogikk
  contexts/       # AuthContext (innlogging/rolle), ProjectContext (aktiv leilegheit)
  components/
    auth/         # LoginPage
    layout/       # TopBar, StatusBar, TabNav, Layout
    dashboard/    # ChannelFeed, UpcomingMaintenance, ErrorReportButton/-Modal
    maintenance/  # Planliste, plan-skjema, logg-skjema
    documents/    # FDV-kategoriliste og -postar med synlegskapsstyring
    cases/        # Saksliste og saksdetalj med meldingstråd
    admin/        # AdminDashboard, TenantManagement, Project-/Property-/LeaseForm
    settings/     # SettingsTab
    shared/       # Modal, StatusBadge, NoActiveProperty
supabase-bygningsapp.sql   # Heile databaseskjemaet (køyr manuelt, sjå over)
```

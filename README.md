# Bygningsapp

Ein web- og mobilapp for administrering av leilegheiter, FDV-dokumentasjon, feilrapportering og vedlikehald.

## Setup-status

✅ **Done:**
- Vite + React initialisert
- Supabase-klient installert
- `.env.local` konfigurert
- Dependencies installert

## Neste steg

1. **GitHub-repo**
   ```bash
   cd "C:\Users\gemli\Jottacloud\Lied Lab\Web\bygningsapp"
   git init
   git add .
   git commit -m "Initial commit - Vite setup with Supabase config"
   git branch -M main
   git remote add origin https://github.com/geirmagnelied/bygningsapp.git
   git push -u origin main
   ```

2. **Vercel-deploy**
   - Gå til https://vercel.com
   - Kopla GitHub-repo
   - Set miljøvariabler (same som i `.env.local`)
   - Deploy

3. **Supabase-tabeller**
   - Legg til tabellar med prefikser `bg_*`
   - Sett opp RLS-policies for dataisolasjon
   - Se systemdokumentasjonen for detaljar

4. **Frontend-utvikling**
   - Start dev-server: `npm run dev`
   - Bygg grunnstrukturen i Claude Code

## Kommandoar

```bash
npm run dev      # Start dev-server på http://localhost:5173
npm run build    # Bygg for produksjon
npm run preview  # Førehandsvis produksjonsbuild lokalt
```

## Dokumentasjon

Se `bygningsmasse-fdv-claude.md` for komplett systemdokumentasjon.

---

**Starten på Bygningsapp er klar. No kan du gå over til Claude Code!** 🚀

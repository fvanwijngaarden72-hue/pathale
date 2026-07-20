# Pathale 🗺️

Jouw persoonlijke reisdagboek met AI-analyse, GPS tracking en spraaknotities.

## Bestanden
```
pathale/
├── index.html                        ← De app
├── netlify.toml                      ← Netlify configuratie
├── package.json                      ← Dependencies
└── netlify/functions/
    ├── analyze-photo.js              ← AI foto-analyse (Anthropic)
    └── stops.js                      ← Database + foto-opslag (Supabase)
```

## Setup

### 1. Supabase instellen
Ga naar je Supabase project → SQL Editor en run:

```sql
create table stops (
  id uuid default gen_random_uuid() primary key,
  name text,
  lat float,
  lng float,
  note text,
  ai_analysis text,
  photos text[],
  created_at timestamptz default now()
);
alter table stops enable row level security;
create policy "Public read" on stops for select using (true);
create policy "Public insert" on stops for insert with check (true);
create policy "Public delete" on stops for delete using (true);
```

Ga naar Storage → New bucket → naam: `photos` → zet op **Public**

### 2. Deploy op Netlify
1. Verbind je GitHub repo met Netlify
2. Ga naar **Site settings → Environment variables** en voeg toe:
   - `ANTHROPIC_KEY` = jouw Anthropic API key
   - `SUPABASE_URL` = https://jouwproject.supabase.co
   - `SUPABASE_KEY` = jouw Supabase anon key
3. Deploy!

## Features
- 🗺️ Interactieve kaart met stops en route
- 📸 Meerdere foto's per stop (drag & drop)
- ✨ Automatische AI-analyse van foto's via Claude Vision
- 🎤 Spraak-naar-tekst notities
- 📍 GPS locatie of klik op kaart
- 💾 Opslaan in Supabase
- 🔗 Deelbare link voor vrienden

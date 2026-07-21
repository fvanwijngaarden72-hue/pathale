# Pathale 🗺️

Jouw persoonlijke reisdagboek met AI-analyse, dagverhalen, live GPS-volgen en fotoboek-export.

## Bestanden
```
pathale/
├── index.html                        ← De app
├── manifest.json                     ← iPhone/PWA installatie
├── netlify.toml                      ← Netlify configuratie
├── package.json                      ← Dependencies
├── icons/                            ← App-iconen
└── netlify/functions/
    ├── analyze-photo.js              ← AI foto-analyse (Anthropic)
    ├── day-story.js                  ← AI dagverhaal (Anthropic + Supabase)
    ├── verify-code.js                ← Toegangscode-controle
    └── stops.js                      ← Database + foto-opslag + trackpoints (Supabase)
```

## Setup

### 1. Supabase — database en opslag
Ga naar je Supabase project → **SQL Editor** en run:

```sql
-- Stops
create table if not exists stops (
  id uuid default gen_random_uuid() primary key,
  name text, lat float, lng float,
  note text, ai_analysis text,
  photos text[], created_at timestamptz default now()
);
alter table stops enable row level security;
drop policy if exists "Public read" on stops;
create policy "Public read" on stops for select using (true);
drop policy if exists "Public insert" on stops;
create policy "Public insert" on stops for insert with check (true);
drop policy if exists "Public delete" on stops;
create policy "Public delete" on stops for delete using (true);
drop policy if exists "Public update" on stops;
create policy "Public update" on stops for update using (true) with check (true);

-- Dagverhalen
create table if not exists day_stories (
  date text primary key,
  story text,
  updated_at timestamptz default now()
);
alter table day_stories enable row level security;
drop policy if exists "Public read day_stories" on day_stories;
create policy "Public read day_stories" on day_stories for select using (true);
drop policy if exists "Public upsert day_stories" on day_stories;
create policy "Public upsert day_stories" on day_stories for insert with check (true);
drop policy if exists "Public update day_stories" on day_stories;
create policy "Public update day_stories" on day_stories for update using (true) with check (true);

-- Reis-status (titel, afgerond/actief)
create table if not exists trip_meta (
  id int primary key default 1,
  title text default 'Mijn Reis',
  status text default 'actief',
  finished_at timestamptz
);
alter table trip_meta enable row level security;
drop policy if exists "Public read trip_meta" on trip_meta;
create policy "Public read trip_meta" on trip_meta for select using (true);
drop policy if exists "Public insert trip_meta" on trip_meta;
create policy "Public insert trip_meta" on trip_meta for insert with check (true);
drop policy if exists "Public update trip_meta" on trip_meta;
create policy "Public update trip_meta" on trip_meta for update using (true) with check (true);

-- Live volgen (trackpoints)
create table if not exists trackpoints (
  id uuid default gen_random_uuid() primary key,
  lat float, lng float,
  created_at timestamptz default now()
);
alter table trackpoints enable row level security;
drop policy if exists "Public read trackpoints" on trackpoints;
create policy "Public read trackpoints" on trackpoints for select using (true);
drop policy if exists "Public insert trackpoints" on trackpoints;
create policy "Public insert trackpoints" on trackpoints for insert with check (true);
drop policy if exists "Public delete trackpoints" on trackpoints;
create policy "Public delete trackpoints" on trackpoints for delete using (true);

-- Foto-opslag
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "Public upload photos" on storage.objects;
create policy "Public upload photos" on storage.objects for insert with check (bucket_id = 'photos');

drop policy if exists "Public read photos" on storage.objects;
create policy "Public read photos" on storage.objects for select using (bucket_id = 'photos');
```

### 2. Netlify — environment variables
**Site configuration → Environment variables:**

| Variabele | Waarde |
|---|---|
| `ANTHROPIC_KEY` | jouw Anthropic API key |
| `SUPABASE_URL` | `https://jouwproject.supabase.co` |
| `SUPABASE_KEY` | jouw Supabase publishable/anon key |
| `ACCESS_CODE` | *(optioneel)* een zelfgekozen toegangscode, bijv. `antwerpen2026` |

Zonder `ACCESS_CODE` staat de app open voor iedereen met de link. Stel je hem in, dan moet iedereen (ook jijzelf) eenmalig deze code invoeren — daarna onthoudt de browser dat.

Na het toevoegen: **Deploys → Trigger deploy**.

## Features
- 🗺️ Interactieve kaart met foto-pins, genummerde route en dag-groepering
- 📸 Meerdere foto's per stop (drag & drop), verkleind voor snelle upload
- 📍 **Automatische locatie uit foto's** — als locatie aanstond bij het maken van de foto, wordt de plek automatisch herkend (GPS-data in de foto zelf)
- ✨ Automatische AI-analyse van foto's via Claude Vision, incl. herkenning van gebouwen/landmarks
- 🔄 Regenereer de AI-tekst — verwerkt je eigen notitie/gesproken tekst in het verhaal
- 📖 **Dagverhaal** — AI schrijft één samenhangend verhaal per reisdag; "✨ Bouw mijn verhaal" genereert alle ontbrekende dagverhalen in één keer
- 🎤 Spraak-naar-tekst notities
- 🔍 Locatie ook handmatig zoeken op naam
- ✏️ Stops achteraf bewerken
- 🔴 **Live volgen** — tekent je route automatisch bij zolang de app open is op je scherm (zie beperking hieronder)
- 📖 **Fotoboek-export** — genereert een PDF van de hele reis
- 🔐 Optionele toegangscode voor een besloten reis
- 💾 Alles opgeslagen in Supabase
- 🔗 Deelbare link
- 🏁 **Reis afronden** — markeer de reis als voltooid (met datum), of heropen 'm weer
- ⬇️ **Reisboek-data exporteren** — download alle reisdata als JSON, om er in Claude een echt reisboekje van te laten maken (zie hieronder)

## Van app naar reisboekje
1. Klik in de app op **⬇️ Reisboek-data** (kan ook tijdens de reis, hoeft niet afgerond te zijn)
2. Er downloadt een `.json` bestand met al je stops, foto's, notities, AI-teksten en dagverhalen
3. Upload dat bestand in een Claude-gesprek en vraag om een reisboekje — Claude kan er een Word-document of een rijk vormgegeven pagina van maken

## Locatie uit foto's — hoe het werkt
Pathale leest de GPS-coördinaten uit de EXIF-data van je foto (dezelfde data die je ziet in de Foto's-app onder "Info"). Dit werkt alleen als:
- Locatietoegang aanstond in je camera-app toen je de foto maakte
- De foto als JPEG wordt geüpload (de meest voorkomende situatie bij delen vanaf iPhone/Android)

Vindt de app geen locatie in de foto, dan val je automatisch terug op handmatig zoeken of op de kaart klikken.

## Beperking: achtergrond GPS-tracking
"Live volgen" gebruikt de locatie-API van de browser en werkt **alleen zolang de app open en actief is** op je scherm. Zodra je 'm sluit, naar een andere app schakelt of je scherm vergrendelt, stopt iOS het bijhouden — dit is een beperking van Apple/Safari voor webapps (PWA's), niet iets wat in deze code op te lossen is. Voor écht doorlopend tracken op de achtergrond (ook met dichte app) is een native app nodig (bijv. gebouwd met Capacitor of Swift) — dat is een apart, groter bouwproject.

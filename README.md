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
  photos text[] default '{}',
  updated_at timestamptz default now()
);
alter table day_stories add column if not exists photos text[] default '{}';
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
| `EDITOR_CODE` | *(optioneel)* een aparte code die bewerkrechten geeft — zie hieronder |

Zonder `ACCESS_CODE` staat de app open voor iedereen met de link. Stel je hem in, dan moet iedereen (ook jijzelf) eenmalig deze code invoeren — daarna onthoudt de browser dat.

## Kijkers vs bewerkers
Standaard (zonder `EDITOR_CODE`) kan iedereen die de app kan openen ook alles bewerken — stops toevoegen, verwijderen, AI-teksten genereren, enz.

Wil je dat delen wél maar bewerken niet kan (bijv. voor familie die alleen wil meekijken)?
1. Zet in Netlify een `EDITOR_CODE` (bijv. `frankbewerkt`) — dit mag **dezelfde of een andere** code zijn dan je `ACCESS_CODE`
2. Iedereen die de app opent, ziet 'm nu standaard in **kijkmodus** ("👁 Alleen bekijken")
3. Klik op **🔓 Bewerkrechten invoeren** en voer de `EDITOR_CODE` in om zelf wél te kunnen bewerken — dit wordt onthouden in de browser
4. Anderen die alleen de gewone link/toegangscode hebben, blijven in kijkmodus

Dit wordt ook op de server gecontroleerd (niet alleen verstopte knoppen) — zonder de juiste `EDITOR_CODE` accepteert de backend geen enkele wijziging, ook niet als iemand de app zelf zou proberen te omzeilen.

⚠️ Zonder `EDITOR_CODE` ingesteld heeft iedereen bewerkrechten, zoals voorheen — deze functie is volledig optioneel.

Na het toevoegen: **Deploys → Trigger deploy**.

## Features
- 🗺️ Interactieve kaart met foto-pins, genummerde route en dag-groepering
- 📸 Meerdere foto's per stop (drag & drop), verkleind voor snelle upload
- 📍 **Automatische locatie uit foto's** — als locatie aanstond bij het maken van de foto, wordt de plek automatisch herkend (GPS-data in de foto zelf)
- ✨ AI-analyse van foto's via Claude Vision (op jouw verzoek — je bepaalt zelf wanneer, kost tokens)
- 🔄 Regenereer de AI-tekst — verwerkt je eigen notitie/gesproken tekst in het verhaal
- 📖 **Dagverhaal** — AI schrijft één samenhangend verhaal per reisdag; "✨ Bouw mijn verhaal" genereert alle ontbrekende dagverhalen in één keer
- 🎤 Spraak-naar-tekst notities
- 🔍 Locatie ook handmatig zoeken op naam
- ✏️ Stops achteraf bewerken
- 🔴 **Live volgen** — tekent je route automatisch bij zolang de app open is op je scherm (zie beperking hieronder)
- 📍 **Route uit foto's** — geen live tracking gehad? Selecteer achteraf een serie foto's van bijv. een fietstocht of rondrit, en de app leest de locatie uit élke foto om alsnog een route te tekenen — zonder dat je elk punt als losse stop hoeft aan te maken
- 📖 **Fotoboek-export** — genereert een PDF van de hele reis
- ⬇️ **Foto's downloaden** — los, per dag (ZIP) of de hele reis in één keer (ZIP) — zie hieronder
- 🔐 Optionele toegangscode voor een besloten reis
- 💾 Alles opgeslagen in Supabase
- 🔗 Deelbare link
- 🏁 **Reis afronden** — markeer de reis als voltooid (met datum), of heropen 'm weer
- ⬇️ **Reisboek-data exporteren** — download alle reisdata als JSON, om er in Claude een echt reisboekje van te laten maken (zie hieronder)

## Van app naar reisboekje
1. Klik in de app op **⬇️ Reisboek-data** (kan ook tijdens de reis, hoeft niet afgerond te zijn)
2. Er downloadt een `.json` bestand met al je stops, foto's, notities, AI-teksten en dagverhalen
3. Upload dat bestand in een Claude-gesprek en vraag om een reisboekje — Claude kan er een Word-document of een rijk vormgegeven pagina van maken

## Google Photos koppelen (optioneel)
Bij elke "opslaan"-actie (foto-viewer, dagfoto's, alle reisfoto's) krijg je een keuzemenu met **📤 Naar Google Photos** als eerste optie. Om die te laten werken:

1. Ga naar [console.cloud.google.com](https://console.cloud.google.com) → maak een nieuw project (of gebruik een bestaand)
2. **APIs & Services → Library** → zoek **"Photos Library API"** → **Enable**
3. **APIs & Services → OAuth consent screen** → kies **External** → vul een naam en je eigen e-mailadres in → onder **Test users** voeg je jouw eigen Google-account (en evt. dat van medereizigers) toe — zo hoef je niet door Google's uitgebreide beoordelingsproces, en werkt het meteen voor die specifieke accounts
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type **Web application** → bij **Authorized JavaScript origins** vul je je Netlify-URL in (bijv. `https://jouw-site.netlify.app`)
5. Kopieer de gegenereerde **Client ID** (geen secret nodig — deze mag openbaar zijn)
6. Zet in Netlify de environment variable `GOOGLE_CLIENT_ID` op die waarde → **Trigger deploy**

Daarna verschijnt bij het eerste gebruik een Google-inlogscherm; na toestemming geven werkt de knop voor de rest van die sessie.

⚠️ Zolang de OAuth-app in "Testing"-status staat (stap 3), werkt dit alleen voor de accounts die je expliciet als testgebruiker hebt toegevoegd — logisch voor privégebruik, maar niet geschikt om zomaar aan iedereen te delen.

## Locatie uit foto's — hoe het werkt
Pathale leest de GPS-coördinaten uit de EXIF-data van je foto (dezelfde data die je ziet in de Foto's-app onder "Info"). Dit werkt alleen als:
- Locatietoegang aanstond in je camera-app toen je de foto maakte
- De foto als JPEG wordt geüpload (de meest voorkomende situatie bij delen vanaf iPhone/Android)

Vindt de app geen locatie in de foto, dan val je automatisch terug op handmatig zoeken of op de kaart klikken.

## Beperking: foto's komen niet automatisch in de Foto's-app
Foto's die je via Pathale toevoegt (ook via "Foto maken" in het uploadscherm) worden alleen opgeslagen in de app-database (Supabase) — niet automatisch in de Foto's-app van je iPhone. Dit is een beperking van Safari/iOS voor webapps: websites hebben geen schrijftoegang tot je native fotobibliotheek. Dit geldt voor elke webapp, niet alleen Pathale.

Twee manieren om foto's toch op je toestel te krijgen:
- **Snelst, per foto:** open een foto in de viewer en houd 'm ingedrukt → iOS toont "Bewaar afbeelding" / "Voeg toe aan foto's" — werkt direct, geen extra code nodig
- **In bulk:** gebruik de ⬇️-downloadknoppen — per foto, per dag (ZIP) of de hele reis in één keer (ZIP, onderaan de zijbalk). Op iPhone komt een ZIP terecht in de Bestanden-app; via "Uitpakken" en dan delen naar Foto's zet je ze alsnog over.

## Beperking: achtergrond GPS-tracking
"Live volgen" gebruikt de locatie-API van de browser en werkt **alleen zolang de app open en actief is** op je scherm. Zodra je 'm sluit, naar een andere app schakelt of je scherm vergrendelt, stopt iOS het bijhouden — dit is een beperking van Apple/Safari voor webapps (PWA's), niet iets wat in deze code op te lossen is. Voor écht doorlopend tracken op de achtergrond (ook met dichte app) is een native app nodig (bijv. gebouwd met Capacitor of Swift) — dat is een apart, groter bouwproject.

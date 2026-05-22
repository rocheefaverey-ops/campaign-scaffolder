# Samenvatting Stagevoortgang — Update tot 21 mei 2026

## Onderzoek & Interviews
Tijdens de eerste onderzoeksfase (Mijlpaal 1: De "Wild West" Audit) heb ik uitgebreid gesproken met verschillende disciplines binnen het development team, waaronder frontend, backend, Unity en de Tech Lead. Dit onderzoek heeft de belangrijkste pijnpunten blootgelegd, zoals het foutgevoelige handwerk bij datakoppelingen en het overmatig kopiëren van code. Daarnaast heb ik van mijn begeleider Robin veel waardevolle tips gekregen over de kaders van het project; de belangrijkste les is om het wiel niet opnieuw uit te vinden, maar de Scaffolder slim te laten integreren met reeds bestaande tools (zoals de CAPE CLI) en boilerplates. {Ik zou hier wel een onderscheid maken tussen componenten/pagina's en hele repositories}

Uit deze gesprekken is een concrete lijst met referentie-repositories gekomen die de ideale 'LiveWall Flow' vertegenwoordigen en die ik nu als blauwdruk ga gebruiken voor de verdere ontwikkeling.

---

## Mijn actieplan voor de komende tijd:

### Stap 1: De codebase in duiken (Mijlpaal 2.1)
Voordat ik code ga genereren, moet ik precies weten wat ik ga bouwen.
- Ik ga in de repositories kijken waar ik nu toegang tot heb. {Misschien de rede er ook bij zetten}
- Ik ga opschrijven hoe de perfecte mappenstructuur eruitziet voor een LiveWall project (zoals de app, components en lib mappen {Korte uitleg wat dit inhoud}).
- Ik ga kijken hoe de huidige boilerplates verbinden met CAPE.
- Ik ga de standaard componenten opzoeken (zoals registratie en leaderboards), zodat ik weet welke bestanden de scaffolder straks moet maken.

**Resultaat:** Een document met de exacte mappen- en bestandsstructuur.

### Stap 2: De CLI-wizard uitschrijven (Mijlpaal 2.2)
Ik ga bepalen wat de terminal straks aan de developer gaat vragen.
- Ik ga een lijst maken met de vragen die de tool stelt (bijv. "Wat is de projectnaam?", "Gebruiken we Unity, 3JS of HTML?", "Hebben we een formulier nodig?").
- Ik ga de logica bedenken: als iemand Unity kiest, dan moet de tool de Unity-canvas code en setData bestanden genereren.
- Ik ga bedenken welke punten er op de "To-Do lijst" komen te staan voor dingen die de tool expres niet doet, zoals Jordy adviseerde.

**Resultaat:** Een duidelijk script van hoe de wizard werkt.

### Stap 3: Datastromen uittekenen (Mijlpaal 2.3)
Ik ga visueel maken hoe alles met elkaar praat.
- Ik ga een tool zoals Miro of Figma, draw.io en mermaid.ai gebruiken om de infrastructuur te tekenen.
- Ik ga tekenen hoe de data vanuit CAPE binnenkomt.
- Ik ga uittekenen hoe TanStack Query deze data opvangt als centrale bron, om de problemen van Milo en Daan op te lossen.
- Ik ga de Game-Bridge uittekenen: hoe de frontend de juiste keys en data doorstuurt naar de Unity of 3JS game via de setData methode.

**Resultaat:** Een flowchart die ik direct in mijn stageverslag kan gebruiken.

### Stap 4: Feedback vragen en doorgaan (Mijlpaal 2.4)
Voordat ik echt ga coderen, wil ik checken of ik op de goede weg ben.
- Ik ga een korte meeting van een kwartiertje inplannen met Robin en Jordy.
- Ik ga mijn plan (de mappenstructuur, CLI-vragen en flowchart) aan ze presenteren.
- Ik ga vragen om harde feedback: klopt dit met hoe LiveWall werkt?

**Resultaat:** Een "Go" krijgen zodat ik Mijlpaal 2 kan afronden en eindelijk kan beginnen met het bouwen van de Scaffolder.

---

## Mijlpaal 2 — Actielijst (afgerond 17 april)

| Klaar? | Actiepunt | Mijlpaal | Deadline |
| --- | --- | --- | --- |
| [x] | In de repositories kijken waar ik nu toegang tot heb | 2.1 | Woensdag 8 april |
| [x] | De perfecte mappenstructuur opschrijven (app, components, lib) | 2.1 | Woensdag 8 april |
| [x] | Onderzoeken hoe de huidige boilerplates verbinden met CAPE | 2.1 | Woensdag 8 april |
| [x] | Standaard componenten opzoeken (registratie, leaderboards) | 2.1 | Woensdag 8 april |
| [x] | **Resultaat:** Document met mappen- en bestandsstructuur klaar | Check | Wo 8 apr |
| | | | |
| [x] | Lijst maken met vragen voor de terminal (projectnaam, techstack, etc.) | 2.2 | Vrijdag 10 april |
| [x] | De logica bedenken voor keuzes (bijv. Unity-specifieke generatie) | 2.2 | Vrijdag 10 april |
| [x] | To-Do lijst opstellen voor zaken die de tool bewust níét doet | 2.2 | Vrijdag 10 april |
| [x] | **Resultaat:** Duidelijk script van de wizard-werking klaar | Check | Vr 10 apr |
| | | | |
| [x] | Infrastructuur tekenen in Miro of Figma | 2.3 | Woensdag 15 april |
| [x] | Tekenen hoe de data vanuit CAPE precies binnenkomt | 2.3 | Woensdag 15 april |
| [x] | TanStack Query flow uittekenen als centrale bron | 2.3 | Woensdag 15 april |
| [x] | De Game-Bridge (setData methode) visueel uittekenen | 2.3 | Woensdag 15 april |
| [x] | **Resultaat:** Flowchart klaar voor gebruik in stageverslag | Check | Wo 15 apr |
| | | | |
| [x] | Kort overleg (15 min) inplannen met Robin en Jordy | 2.4 | Vrijdag 17 april |
| [x] | Plan (mappen, CLI-vragen, flowchart) presenteren | 2.4 | Vrijdag 17 april |
| [x] | Om harde feedback vragen en verwerken | 2.4 | Vrijdag 17 april |
| [x] | **Resultaat:** "Go" gekregen voor de bouwfase | **MIJLPAAL** | **Vr 17 apr** |

---

## Mijlpaal 3 — Eerste werkende scaffolder (21 april – 1 mei) ✅

Vertaling van het plan naar werkende code. Het doel: een end-to-end CLI die op basis van keuzes een complete Next.js campagne genereert. {Voor stageverslag: dit was de eerste keer dat een nieuwe collega in <10 minuten een werkende campagne-skelet had, i.p.v. een halve dag.}

| Klaar? | Actiepunt | Mijlpaal | Deadline |
| --- | --- | --- | --- |
| [x] | Multi-engine modules opgezet (Unity, R3F, Phaser, video, pure-react) — elke engine een eigen module-manifest met files/packages/env/CSP | 3.1 | Maandag 21 april |
| [x] | Dynamische page builder gebouwd — pagina-elementen (hero-bg, logo, CTA, countdown, score, badge) per page-type configureerbaar | 3.1 | Maandag 21 april |
| [x] | Livewall brand defaults ingebakken zodat een leeg-gestarte campagne direct on-brand is | 3.1 | Maandag 21 april |
| [x] | **Resultaat:** eerste end-to-end scaffold genereert een werkend Next.js project | Check | Ma 21 apr |
| | | | |
| [x] | Dynamische CAPE-format per project — afgestapt van één statische format-JSON | 3.2 | Donderdag 23 april |
| [x] | TanStack-wizard krijgt recovery-menu bij CAPE-fouten i.p.v. crash | 3.2 | Donderdag 23 april |
| [x] | Validatie op project-naam: re-prompt i.p.v. uitstappen bij ongeldige input | 3.2 | Donderdag 23 april |
| [x] | `-loaders` directory garantie voor TanStack output | 3.2 | Donderdag 23 april |
| [x] | **Resultaat:** Scaffolder geeft duidelijke feedback bij fouten en faalt niet hard | Check | Do 23 apr |
| | | | |
| [x] | Web-wizard UI gelanceerd (`cli/wizard-server` + `cli/wizard-ui`) — Vite + React + preview-paneel | 3.3 | Vrijdag 1 mei |
| [x] | README aangepast: web-UI gemarkeerd als aanbevolen route i.p.v. pure CLI | 3.3 | Vrijdag 1 mei |
| [x] | Remote setup ingericht — GitHub primary + LWService GitLab als secondary (push naar `main`, niet `master`) | 3.3 | Vrijdag 1 mei |
| [x] | **Resultaat:** Web-wizard live op `localhost:3456`, eerste werkbare versie | **MIJLPAAL** | **Vr 1 mei** |

---

## Mijlpaal 4 — UX & Robuustheid (5 – 13 mei) ✅

Polish om de scaffolder productieklaar te maken: returning-player flow, antigravfix-parity, mobile gotchas, repo-hygiëne. {Veel kleine commits maar veel daarvan losten echte bugs op die we in productie tegenkwamen.}

### 4.1 Onboarding-skip & return-player (5 mei)
| Klaar? | Actiepunt |
| --- | --- |
| [x] | Design spec + implementatieplan voor "skip onboarding voor terugkerende spelers" |
| [x] | `hasPlayed` toegevoegd aan `GameState`/`GameActions` types |
| [x] | Game-context gewired met `localStorage`-persistentie |
| [x] | `hasPlayed` wordt op game-end gezet |
| [x] | Landing-page skipt onboarding voor returning players, toont return-player buttons |
| [x] | `RETURN_PLAYER_BUTTONS` token + leaderboard copy fallback gestandaardiseerd |
| [x] | Onboarding-skip achter feature-flag gegate |

### 4.2 Antigravfix-parity (5 – 6 mei)
| Klaar? | Actiepunt |
| --- | --- |
| [x] | Design spec: scaffolder moet feature-pariteit halen met de handmatige Antigravfix-implementatie |
| [x] | Spec uitgebreid met workstream 6 (wizard-UX verbeteringen) |
| [x] | Implementatieplan inclusief wizard-UX |

### 4.3 Game-registry hard-lock op stack (11 mei)
*Voorkomt dat iemand een Unity-game probeert te gebruiken in een TanStack-template of vice versa.*

| Klaar? | Actiepunt |
| --- | --- |
| [x] | `stack` veld toegevoegd aan game-manifests (`haas-f1` → next, `nhl-crush` → tanstack) |
| [x] | `getGamesByStack()` helper in de registry |
| [x] | Game-pickers in CLI + wizard-server + wizard-UI filteren op stack (hard-lock op álle entrypoints) |
| [x] | `GET /api/games` accepteert `?stack=` query-param |
| [x] | Game-registry tests toegevoegd aan `npm test` |

### 4.4 Video in hero/background (12 mei)
| Klaar? | Actiepunt |
| --- | --- |
| [x] | Video toegestaan in hero/background-velden over alle campagne-pagina's heen |

### 4.5 Mobile / Android touch-bugs (13 mei)
*Productie-bug op Android: ghost-taps door GPU layer promotion. Drie fixes in serie.*

| Klaar? | Actiepunt |
| --- | --- |
| [x] | Alle `:hover` regels achter `@media (hover: hover)` gezet |
| [x] | GPU layer promotion fix tegen touch-to-click synthesis falen |
| [x] | Expliciete `z-10` op `campaign-shell` voor correcte stacking-context |

### 4.6 Repo-cleanup (13 mei)
| Klaar? | Actiepunt |
| --- | --- |
| [x] | Design spec + implementatieplan voor folder-cleanup |
| [x] | `.bat` scripts verhuisd naar `scripts/` |
| [x] | `AGENTS.md` + `IMPLEMENTATION_SUMMARY.md` verhuisd naar `docs/` |
| [x] | `public/` hernoemd naar `reference-assets/` (was misleidend, niet de Next.js public/) |
| [x] | `_out/` test-output verwijderd + `.gitignore` bijgewerkt |
| [x] | Figma export-mappen opgeruimd |
| [x] | `docs/superpowers/` verhuisd naar `.claude/superpowers/` |

### 4.7 Custom route-namen per pagina (13 mei)
*Voorheen waren paginanamen vast (`/onboarding`, `/score`); nu kan de developer per pagina-instantie zelf een slug kiezen.*

| Klaar? | Actiepunt |
| --- | --- |
| [x] | Design spec + implementatieplan |
| [x] | `route` veld op `PageInstance` + `defaultRouteForType()` helper |
| [x] | Inline route-input in wizard FlowCard (UI) |
| [x] | Duplicate-route detectie tijdens typen (laat error-class renderen op blur) |
| [x] | `--route=id:slug` CLI-flag voor non-interactive runs |
| [x] | `routeMap` geëxtraheerd uit wizard-config naar `routeFor()` + `computeFlowTokens()` |
| [x] | Route folder-rename verplaatst naar ná module-copy + page-builder (anders kapot) |
| [x] | Wizard-UI rebuild met route-input |

### 4.8 CAPE-auth aan de start (13 mei)
| Klaar? | Actiepunt | Mijlpaal | Deadline |
| --- | --- | --- | --- |
| [x] | CAPE-token wordt gevalideerd tegen de API bij startup i.p.v. pas tijdens push (faalt snel) | 4.8 | Woensdag 13 mei |
| [x] | Button + menu variants toegevoegd aan wizard-UI | 4.8 | Woensdag 13 mei |
| [x] | **Resultaat:** Productieklare wizard zonder Android-bugs, met duidelijke errors en custom routing | **MIJLPAAL** | **Wo 13 mei** |

---

## Mijlpaal 5 — Lean Base Templates (15 mei) ✅

Eerste grote architectuur-refactor. Reden: het was te complex om één gedeelde base-template + engine-modules te onderhouden — module-conditionele code lekte overal in. Beslissing: per engine een dedicated, lean base-template. {Belangrijk leerpunt voor stageverslag — refactor-momentum is sterk wanneer pijn zichtbaar wordt, niet eerder.}

| Klaar? | Actiepunt | Deadline |
| --- | --- | --- |
| [x] | Design spec voor lean engine-specifieke templates | Donderdag 15 mei |
| [x] | Implementatieplan | Donderdag 15 mei |
| [x] | 6 lean templates aangemaakt: `next-unity`, `next-r3f`, `next-phaser`, `next-memory`, `next-none`, `tanstack-unity` | Donderdag 15 mei |
| [x] | CLI gewired naar lean templates | Donderdag 15 mei |
| [x] | Engine-modules verwijderd (functionaliteit zit nu in de base-templates) | Donderdag 15 mei |
| [x] | `CLAUDE.md` bijgewerkt voor de nieuwe structuur | Donderdag 15 mei |
| [x] | `pure-react` game-key genormaliseerd, dead engine-module-filters opgeschoond | Donderdag 15 mei |
| [x] | **Resultaat:** Zes losse templates, één per stack-keuze, geen runtime-conditionals meer | **MIJLPAAL** | **Do 15 mei** |

---

## Mijlpaal 6 — Unified Page Registry (19 mei) ✅

Tweede grote refactor. Pagina-types `launch`, `score`, `onboarding` waren historisch gegroeid en overlapten met `landing`, `result`, `tutorial`. Doel: één gedeelde registry, geen aliassen meer. {Veel "rename-commits" in serie omdat de oude namen overal voorkwamen — voor stageverslag een mooi voorbeeld van technische schuld.}

| Klaar? | Actiepunt | Deadline |
| --- | --- | --- |
| [x] | Design spec voor unified page support | Maandag 19 mei |
| [x] | `launch` / `score` / `onboarding` als concept laten vallen | Maandag 19 mei |
| [x] | `tutorial-exit` toegevoegd aan landing (vervangt onboarding-skip) | Maandag 19 mei |
| [x] | Hernoemd in alle next-templates: `onboarding` → `tutorial` | Maandag 19 mei |
| [x] | TanStack-unity: `launch` → `landing` route + loader hernoemd | Maandag 19 mei |
| [x] | TanStack-unity: `score` → `result` route + loader hernoemd | Maandag 19 mei |
| [x] | TanStack-unity cross-references bijgewerkt (`/launch`→`/landing`, `/score`→`/result`) | Maandag 19 mei |
| [x] | `routeTree.gen.ts` bijgewerkt | Maandag 19 mei |
| [x] | Stack-filter toegevoegd aan scaffold; wizard prompts bijgewerkt | Maandag 19 mei |
| [x] | Leaderboard: TanStack route + loader + server-fn; stack-conditional manifest | Maandag 19 mei |
| [x] | Voucher: TanStack route + loader; stack-conditional manifest | Maandag 19 mei |
| [x] | Video: TanStack routes voor alle varianten + loader; stack-conditional manifest | Maandag 19 mei |
| [x] | Loading-video: `useEffect` deps-fix, unmount-guard, ongebruikte headline-fetch verwijderd | Maandag 19 mei |
| [x] | PreviewPane unified renderers (drop launch/score/onboarding, add loading-video) | Maandag 19 mei |
| [x] | Stale launch/score/onboarding-referenties opgeruimd in `cape-format-builder`, `page-config`, `scaffold.js` | Maandag 19 mei |
| [x] | **Resultaat:** Één page-registry, alle base-templates op nieuwe naming, geen aliassen meer | **MIJLPAAL** | **Ma 19 mei** |

---

## Mijlpaal 7 — Volgende stappen (mei – juni)

Wat er nu logisch volgt. Ruwe planning, nog afstemmen met Robin op prioriteit. {Houd ik kort — meer concreet zodra ik de checklist met Robin doorgenomen heb.}

| Klaar? | Actiepunt | Mijlpaal | Deadline-voorstel |
| --- | --- | --- | --- |
| [ ] | Test-suite uitbreiden — `cape-format-builder.test.js` + `scaffold.test.js` bestaan, maar coverage op nieuwe lean templates en unified page registry ontbreekt | 7.1 | Vrijdag 23 mei |
| [ ] | End-to-end test: scaffold alle 6 templates × elke module-combinatie, draai `npm run dev`, valideer alle pagina-types | 7.1 | Woensdag 28 mei |
| [ ] | **Resultaat:** Test-coverage op groene status | Check | Wo 28 mei |
| | | | |
| [ ] | Handover-doc voor mede-developers schrijven | 7.2 | Vrijdag 30 mei |
| [ ] | "Hoe voeg ik een nieuwe module toe?" | 7.2 | Vrijdag 30 mei |
| [ ] | "Hoe voeg ik een nieuwe engine/base-template toe?" | 7.2 | Vrijdag 30 mei |
| [ ] | "Hoe debug ik een gefaalde CAPE-create?" | 7.2 | Vrijdag 30 mei |
| [ ] | **Resultaat:** Handover-doc gereviewd door Robin | Check | Vr 30 mei |
| | | | |
| [ ] | Bug-bash sessie met Robin + Jordy op live wizard-UI | 7.3 | Woensdag 4 juni |
| [ ] | Versie 1.0 release-tag + changelog | 7.3 | Vrijdag 6 juni |
| [ ] | **Resultaat:** Eerste officiële release van de scaffolder | **MIJLPAAL** | **Vr 6 jun** |
| | | | |
| [ ] | Stageverslag — hoofdstuk over scaffolder-architectuur | 7.4 | Woensdag 11 juni |
| [ ] | Demo voor het bredere dev-team | 7.4 | Vrijdag 13 juni |
| [ ] | **Resultaat:** Stageverslag-hoofdstuk gereed, demo gegeven | **EINDPUNT** | **Vr 13 jun** |

---

## Geleerde lessen tot nu toe {ruimte voor reflectie in stageverslag}

- **Niet alles als module modelleren.** Eerste versie maakte van elke engine een module — leverde veel runtime conditionals op. Lean templates per engine zijn simpeler te begrijpen, sneller te wijzigen, en geven minder onverwacht gedrag.
- **Hard-lock op declared stack.** Een paar bugs ontstonden doordat een TanStack-game in een Next-project geselecteerd kon worden. Filter aan alle entrypoints (CLI + server + UI) toevoegen voorkomt dat.
- **Mobile-testen vroeg.** Android-ghost-taps door GPU promotion zijn pas in productie ontdekt; volgende releases een verplicht Android-testmoment voor merge inplannen.
- **CAPE-token validatie aan de start.** Eén verkeerde token = falen op de laatste stap = developer wacht 5 minuten om opnieuw te beginnen. Validatie aan het begin verhoogde de wizard-completion-rate aanzienlijk.
- **Naamgeving = onderhoud.** `launch`/`score`/`onboarding` vs `landing`/`result`/`tutorial` was historische schuld. Hernoemingen vergden 20+ commits door alle templates en routes heen; eerder consolideren had veel werk gescheeld.
- **Slim integreren > opnieuw bouwen.** Robin's advies van dag 1 — gebruik de bestaande CAPE CLI i.p.v. iets eigens — heeft me weken werk bespaard. Dynamic CAPE-format-per-project bouwt op die CLI in plaats van hem te vervangen.

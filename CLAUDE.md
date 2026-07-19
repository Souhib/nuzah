# Piscine Chelles

Site vitrine single-page pour la location d'une piscine privée à Chelles (77500), Île-de-France.

## Stack

- **Runtime**: Bun
- **Build**: Vite 8
- **Framework**: React 19 + TypeScript 5.9
- **CSS**: Tailwind CSS v4 (`@tailwindcss/vite`)
- **Linter**: oxlint (pas ESLint)
- **Animations**: Motion (ex Framer Motion)
- **Smooth scroll**: Lenis
- **i18n**: react-i18next (FR default, EN, AR avec RTL)
- **SEO**: react-helmet-async

## Commandes

```bash
bun dev          # Dev server
bun run build    # Build production
bun run lint     # oxlint
bun run typecheck # tsc --noEmit
```

## Architecture

```
src/
├── components/
│   ├── layout/      # Header, Footer
│   └── sections/    # Hero, Experience, Gallery, Pricing, HowItWorks, Trust, Location, Contact, FAQ
├── hooks/           # useTheme (day/night), useDirection (RTL), useLenis
├── i18n/            # config.ts
├── lib/             # utils.ts (cn)
├── pages/           # Home.tsx (compose toutes les sections)
├── styles/          # global.css (Tailwind + design tokens + glow effects)
├── App.tsx          # HelmetProvider + Header + Home + Footer
└── main.tsx         # Entry point
public/
├── locales/{fr,en,ar}/  # Fichiers de traduction (common, home, pricing)
├── images/              # Photos pool (day, night-cyan, night-green, food)
├── videos/              # Vidéos pool (day, night, food-setup, night-green)
└── favicon.svg
```

## Design

- **Day mode**: fond clair (#FAFCFE), primaire cyan (#02BAD6), accent gold (#F5A623)
- **Night mode**: fond dark (#070B14), LED cyan (#00E5FF), magenta (#FF006E), violet (#8B5CF6)
- **Fonts**: Cormorant (headings) + Montserrat (body) / Noto Naskh Arabic + Noto Sans Arabic
- Toggle jour/nuit via `data-theme="night"` sur `<html>`

## i18n

- Français (défaut), English, العربية (RTL)
- Traductions dans `public/locales/{lng}/{ns}.json`
- Namespaces: `common`, `home`, `pricing`
- Les noms de lieux restent en français dans toutes les langues (Chelles, Île-de-France, RER E, Paris)
- Les mots de liaison (à, dans, depuis) sont traduits dans chaque langue

## Business

### Créneaux (4h chacun) — tarif par personne

Grille uniforme (tous les créneaux au même prix depuis juillet 2026) :

| Créneau | ≤6 pers. | 7-10 | 11-15 |
|---------|----------|------|-------|
| Matinée 10h-14h | 20€/pers | 18€/pers | 17€/pers |
| Après-midi 14h-18h | 20€/pers | 18€/pers | 17€/pers |
| Soirée 18h-22h | 20€/pers | 18€/pers | 17€/pers |
| Nuit 22h-02h *(admin only)* | 20€/pers | 18€/pers | 17€/pers |

**Politique âges** :
- **Bébés** (moins de 3 ans) : gratuits
- **Enfants** (moins de 14 ans) : moitié prix
- S'applique au tarif piscine et au menu à la personne (le plateau à partager reste un forfait).

Le créneau "Nuit" n'est **plus affiché sur le site vitrine** mais reste disponible dans l'admin.
Refonte tarifaire prévue : voir [TARIFS-V2.md](./TARIFS-V2.md).

### Formules repas (sur place)
- 🥡 Plateaux à partager (mini-burgers, fricassés, bricks…) + thé à la menthe : 14€/pers
- 🍽️ Menu traditionnel (entrée + couscous/tajine/pizzas… + thé à la menthe) : 19€/pers
- Cuisine algérienne fait maison
- Plats selon l'inspiration du chef ou sur demande
- Règle : une seule formule par groupe (tout le monde la même)
- Menu adapté aux préférences (allergies, choix...) à préciser à la commande
- À commander 48h à l'avance, minimum 6 personnes

### Réservation
- WhatsApp / téléphone uniquement
- Acompte 10€ (Wero/Revolut/PayPal), déduit du total
- Annulation gratuite 24h avant, remboursement possible même tardif si créneau non perdu

### Inclus
- Piscine 6×3m, profondeur 1.50m, LED
- Snacks & boissons, enceinte Bluetooth, ping-pong, hamac, Nintendo Switch, jeux de société
- Intimité totale (aucun vis-à-vis), groupes de femmes bienvenus
- Jusqu'à 3 places de parking

## Conventions

- Utiliser `cn()` de `@/lib/utils` pour les classes conditionnelles
- Chaque section reçoit `isNight: boolean` en prop
- Les couleurs de thème sont dans les CSS custom properties (`global.css`)
- Pas de `eslint` — on utilise `oxlint`
- Alias `@/` → `src/`
- Pas de routing, single-page avec smooth scroll vers les sections par ID

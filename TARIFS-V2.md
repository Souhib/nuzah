# Tarifs V2 — Refonte 2026-07-11

Document de référence pour la refonte des créneaux et de la grille tarifaire.
**Statut : validé côté décisions, pas encore implémenté.**

---

## 1. Nouveaux créneaux (3 au lieu de 4)

| Nouveau libellé | Horaires | Ancien correspondant |
|---|---|---|
| **Début d'après-midi** | 11h – 15h | Matinée 10h-14h |
| **Milieu d'après-midi** | 15h – 19h | Après-midi 14h-18h |
| **Soirée** | 19h – 23h | Soirée 18h-22h |
| ~~Nuit~~ | *(supprimé)* | Nuit 22h-02h — 0 résa historique |

**Rationale rebranding** :
- « Matinée » évoquait « lever tôt » pour la cible du 91/93.
- « Début d'après-midi » repositionne le slot comme un déjeuner tardif au bord d'une piscine — aspirationnel, family-friendly.
- L'horaire décale d'1h (11h au lieu de 10h) pour respecter les gens qui viennent de loin.

---

## 2. Grille tarifaire

**Prix par personne, selon la taille du groupe** (adulte plein tarif) :

| Créneau | ≤ 6 pers | 7-10 pers | 11-15 pers |
|---|---:|---:|---:|
| Début d'après-midi (11h-15h) | 30€ | 26€ | 22€ |
| Milieu d'après-midi (15h-19h) | 30€ | 26€ | 22€ |
| Soirée (19h-23h) | 25€ | 22€ | 18€ |

**Règles** :
- **Enfants (moins de 14 ans)** : −50 % du tarif adulte
- **Bébés (moins de 3 ans)** : gratuits
- **Pas de floor / minimum** — un couple paie 60€, on assume
- **Pas de tarif weekend** — grille unique 7j/7
- **Discounts / arrondis à l'appréciation** de Souhib (fidèles, recommandations, arrondi 67→60 etc.) — le système n'impose rien

---

## 3. Exemples de facturation

| Composition | Créneau | Calcul | Total |
|---|---|---|---:|
| Couple (2A) | Début d'aprem | 2 × 30 | **60€** |
| Couple + bébé | Milieu d'aprem | 2 × 30 + bébé gratuit | **60€** |
| 1 mère + 2 enfants + 2 bébés | Début d'aprem | 30 + 2 × 15 | **60€** |
| 1 mère + 1 enfant (cas Lynda) | Milieu d'aprem | 30 + 15 | **45€** |
| Famille 2A + 3E | Milieu d'aprem | 2 × 30 + 3 × 15 | **105€** |
| Groupe 6 amis | Milieu d'aprem | 6 × 30 | **180€** |
| Groupe 8 amis | Milieu d'aprem | 8 × 26 | **208€** |
| Groupe 12 amis (10A + 2E) | Milieu d'aprem | 10 × 22 + 2 × 11 | **242€** |
| Groupe 6 amis | Soirée | 6 × 25 | **150€** |
| Groupe 10 amis | Soirée | 10 × 22 | **220€** |

---

## 4. Impact simulé sur l'historique (22/06 → 11/07)

Simulation réalisée sur les **48 résas piscine non-annulées** existantes.

| | Ancien | Nouveau | Δ |
|---|---:|---:|---:|
| **CA piscine total** | 4 937€ | **6 820€** | **+1 884€ (+38%)** |
| Panier moyen | 103€/résa | 142€/résa | +38% |

**Par semaine** :

| Semaine | Résas | Ancien | Nouveau | Δ |
|---|---:|---:|---:|---:|
| 22-28/06 | 10 | 1 125€ | 1 449€ | +324€ (+29%) |
| 29/06-05/07 | 7 | 909€ | 1 297€ | +388€ (+43%) |
| 06-12/07 | 13 | 1 180€ | 1 669€ | +490€ (+42%) |
| 13-19/07 | 9 | 793€ | 1 106€ | +314€ (+40%) |
| 20-26/07 | 7 | 664€ | 968€ | +304€ (+46%) |
| 27/07-02/08 | 2 | 266€ | 331€ | +64€ (+24%) |

**Par créneau** :

| Créneau | Résas | Ancien CA | Nouveau CA | Δ |
|---|---:|---:|---:|---:|
| Début d'aprem (ex-matinée) | 10 | 849€ | 1 258€ | +48% |
| Milieu d'aprem (ex-après-midi) | 31 | 3 211€ | 4 587€ | +43% |
| Soirée | 7 | 877€ | 976€ | +11% |

---

## 5. Ce que la refonte n'adresse PAS

**Le problème "milieu d'aprem saturé"** — en alignant début et milieu à 30€/p, il n'y a plus de différentiel qui redirigerait naturellement la demande. Si Souhib refuse encore beaucoup de résas milieu d'aprem après la mise en place, envisager de scinder : **28€ début / 30€ milieu** (levier réversible).

**Le cas 1A+1E (Lynda)** — reste à 45€ minimum. Deux options si problème :
- Communiquer un **minimum 2 adultes** à la prise de résa (règle marketing)
- Laisser tel quel (Lynda est fidèle, 45€ est un geste de loyauté implicite)

---

## 6. Notes d'implémentation (à faire plus tard)

### Backend
- **`api/constants.py`** :
  - `ADULT_PRICE_GRID` : nouvelles valeurs 30/26/22 pour morning + afternoon, 25/22/18 pour evening
  - `SLOT_DEFAULT_HOURS` : morning devient (11, 15, False), afternoon (15, 19, False), evening (19, 23, False)
- **`api/models/table.py`** :
  - `Slot` enum : garder les 4 valeurs (morning/afternoon/evening/night) pour compat, mais `night` devient legacy caché du form
- **`SLOT_DEFAULT_HOURS`** : mettre à jour les horaires

### Admin (frontend)
- **`SLOT_LABELS`** (`api.ts`) : nouveaux libellés
  - morning → "Début d'après-midi", "11h – 15h"
  - afternoon → "Milieu d'après-midi", "15h – 19h"
  - evening → "Soirée", "19h – 23h"
- **`ReservationForm.tsx`** : slot picker n'affiche plus "Nuit" (comme la formule `platters_14` legacy)
- **Aperçu grid** : 3 colonnes au lieu de 4
- **Message "Partager les dispos"** : 3 créneaux au lieu de 4, nouveaux libellés + horaires
- **`SLOT_DEFAULT_HOURS`** (client) : miroir des heures backend

### Vitrine
- **`public/locales/{fr,en,ar}/pricing.json`** : nouveau tableau tarifs + libellés
- **`public/locales/{fr,en,ar}/home.json`** : FAQ mentionnant les nouveaux horaires
- **`CLAUDE.md`** : bloc "Créneaux" à mettre à jour

### Compatibilité historique
- **Les 10 résas "morning" existantes** : gardent leur libellé "Matinée 10h-14h" à l'affichage. Idée : ajouter un flag legacy dans SLOT_LABELS pour distinguer, ou juste laisser les start_at/end_at existants dicter l'affichage horaire.
- **Aucune résa "night"** à traiter — enum reste valide en DB, juste caché du form.

---

## 7. Décisions déjà prises

- ✅ 3 créneaux au lieu de 4
- ✅ Horaires 11h/15h/19h/23h
- ✅ Rebrand début / milieu d'après-midi / soirée
- ✅ Grille 30/26/22 pour les deux créneaux d'après-midi
- ✅ Grille 25/22/18 pour la soirée (validé après simulation)
- ✅ Pas de floor
- ✅ Pas de tarif weekend
- ✅ Enfants -50 %, bébés gratuits — inchangé
- ✅ Discounts/arrondis restent à la main de Souhib

---

*Document créé le 2026-07-11. À implémenter quand Souhib donne le feu vert.*

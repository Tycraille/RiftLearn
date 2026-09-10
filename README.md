# RiftLearn

Application web (PC et smartphone) pour apprendre et réviser les cartes les plus jouées de **Riftbound TCG**, à la manière d'Anki : fiches recto/verso, répétition espacée (FSRS), quiz, tableau de bord de progression.

## Fonctionnalités

- **Trois modes de révision** : Image → nom + effet, Nom → effet + coût, Quiz à choix multiples. Chaque mode a sa propre progression par carte.
- **Répétition espacée** avec l'algorithme FSRS (`ts-fsrs`), notation Encore / Difficile / Bien / Facile, intervalles prévisionnels affichés.
- **Paquets automatiques** : toutes les cartes méta, par domaine, par type, par set. Le seuil de taux de jeu est réglable.
- **Paquets personnalisés** : import d'une decklist (texte collé) ou ajout carte par carte depuis sa fiche.
- **Contexte méta** au verso : taux de jeu, taux de victoire, copies moyennes, nombre de decks.
- **Tableau de bord** : cartes dues par mode, série de jours, heatmap 12 semaines, progression par domaine et type.
- **Progression locale** (IndexedDB) avec export / import JSON pour changer d'appareil.
- Raccourcis clavier sur PC : `Espace` retourner, `1`–`4` noter, `Échap` quitter.

## Démarrer

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:5173.

## Mettre à jour les données de cartes

```bash
npm run import
```

Le script `scripts/import.ts` :

1. lit les stats méta embarquées dans la page https://riftdecks.com/cards/stats (`var DATA = [...]`) ; la page est protégée par Cloudflare, le script bascule automatiquement sur Playwright (Chromium headless) si le fetch direct est refusé ;
2. récupère les fiches complètes (coût, texte, image, rareté) via l'API ouverte https://api.riftcodex.com ;
3. joint les deux sources sur l'identifiant `riftbound_id` (ex. `ogn-045-298`) et écrit `public/data/cards.json`.

Première utilisation du repli Playwright :

```bash
npx playwright install chromium
```

## Tests et build

```bash
npm test
npm run build
```

## Déploiement

Un workflow GitHub Actions (`.github/workflows/deploy.yml`) construit et publie l'app sur GitHub Pages à chaque push sur `main` (activer *Settings → Pages → Source : GitHub Actions* dans le dépôt). Le routage utilise un `HashRouter`, ce qui fonctionne sur n'importe quel hébergement statique (Vercel, Netlify…).

## Structure

```
scripts/import.ts      import des données (riftdecks + Riftcodex)
scripts/merge.ts       jointure et normalisation (testé)
public/data/cards.json données générées
src/data/              types et chargement du JSON
src/db/                Dexie (IndexedDB) : états SRS, journal, paquets, réglages
src/srs/               wrapper ts-fsrs
src/study/             modes, file de session, générateur de QCM
src/decks/             paquets dérivés et parseur de decklist
src/ui/                pages et composants React
```

Sources de données : [riftdecks.com](https://riftdecks.com) (stats de tournoi) et [riftcodex.com](https://riftcodex.com) (base de cartes). Projet de fan, non affilié à Riot Games.

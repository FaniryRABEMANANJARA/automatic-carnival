# Application de Gestion Budgétaire Mensuelle

Application web de gestion budgétaire mensuelle construite avec Next.js, LowDB (JSON) et Material-UI.

## Fonctionnalités

- 📊 Dashboard avec vue d'ensemble des revenus, dépenses et solde
- 💰 Gestion des transactions (revenus et dépenses)
- 📁 Catégorisation automatique des transactions
- 📅 Suivi mensuel des finances
- 🗑️ Suppression de transactions

## Technologies utilisées

- **Next.js 14** - Framework React avec App Router
- **LowDB** - Base de données JSON simple et efficace
- **Material-UI (MUI)** - Interface utilisateur
- **TypeScript** - Typage statique
- **Vercel** - Déploiement

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Lancer le serveur de développement :
```bash
npm run dev
```

3. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Structure de la base de données

La base de données est stockée dans `data/budget.json` au format JSON.

### Collection `transactions`
- `id` - Identifiant unique
- `type` - Type de transaction ('income' ou 'expense')
- `category` - Catégorie de la transaction
- `description` - Description optionnelle
- `amount` - Montant
- `date` - Date de la transaction
- `created_at` - Date de création

### Collection `categories`
- `id` - Identifiant unique
- `name` - Nom de la catégorie
- `type` - Type ('income' ou 'expense')
- `color` - Couleur de la catégorie

## Déploiement sur Vercel

1. Connecter votre repository GitHub à Vercel
2. Vercel détectera automatiquement Next.js
3. La base de données JSON sera créée automatiquement dans le système de fichiers éphémère

**Note:** Pour la production, considérez l'utilisation d'une base de données cloud (PostgreSQL, MongoDB, etc.) car le système de fichiers sur Vercel est éphémère.

## Scripts disponibles

- `npm run dev` - Démarre le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm start` - Démarre le serveur de production
- `npm run lint` - Lance le linter

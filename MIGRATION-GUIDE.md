# Guide de Migration vers Vercel Postgres

## 📋 Prérequis

1. Un projet Vercel déployé
2. Accès au tableau de bord Vercel

## 🚀 Étapes de Migration

### Étape 1 : Créer la base de données Postgres sur Vercel

1. **Connectez-vous à Vercel** et ouvrez votre projet
2. Allez dans l'onglet **Storage** (ou **Integrations**)
3. Cliquez sur **Create Database** ou **Browse Marketplace**
4. Recherchez **"Postgres"** ou **"Neon Postgres"**
5. Cliquez sur **Add Integration**
6. Choisissez :
   - **Région** : La plus proche de vos utilisateurs (ex: `cdg1` pour Paris)
   - **Plan** : Free tier pour commencer
   - **Nom** : Donnez un nom à votre base de données
7. Cliquez sur **Create**

Vercel configurera automatiquement les variables d'environnement suivantes :
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### Étape 2 : Migrer les données existantes

Une fois la base de données créée, vous avez deux options :

#### Option A : Migration via l'API (Recommandé)

1. Déployez votre application avec les nouvelles routes API
2. Appelez l'endpoint de migration :
   ```bash
   curl -X POST https://votre-app.vercel.app/api/migrate
   ```

#### Option B : Migration locale

1. Récupérez les variables d'environnement depuis Vercel
2. Créez un fichier `.env.local` avec ces variables
3. Exécutez le script de migration :
   ```bash
   npm run migrate
   ```

### Étape 3 : Vérifier la migration

1. Vérifiez que toutes vos transactions sont présentes
2. Vérifiez que toutes vos catégories sont présentes
3. Testez la création d'une nouvelle transaction
4. Testez la création d'une nouvelle catégorie

### Étape 4 : Nettoyage (Optionnel)

Une fois que vous êtes sûr que tout fonctionne :

1. Faites une sauvegarde de `data/budget.json` (au cas où)
2. Vous pouvez supprimer `data/budget.json` (les données sont maintenant dans Postgres)
3. Vous pouvez garder `lib/db.ts` comme backup ou le supprimer

## 🔧 Structure de la Base de Données

### Table `transactions`
- `id` (SERIAL PRIMARY KEY)
- `type` (VARCHAR) - 'income' ou 'expense'
- `category` (VARCHAR)
- `description` (TEXT)
- `amount` (DECIMAL)
- `currency` (VARCHAR) - 'MGA' ou 'RMB'
- `date` (DATE)
- `created_at` (TIMESTAMP)
- `income_source` (VARCHAR, nullable)

### Table `categories`
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `type` (VARCHAR) - 'income' ou 'expense'
- `color` (VARCHAR)
- `created_at` (TIMESTAMP)

## ⚠️ Notes Importantes

- Les tables sont créées automatiquement au premier appel de l'API
- Les catégories par défaut sont insérées automatiquement
- La migration préserve tous les IDs existants
- Les données sont migrées avec `ON CONFLICT DO NOTHING` pour éviter les doublons
- La base de données est persistante sur Vercel (contrairement au fichier JSON)

## 🐛 Dépannage

### Erreur : "Cannot find module '@vercel/postgres'"
```bash
npm install @vercel/postgres
```

### Erreur : "Connection refused"
- Vérifiez que les variables d'environnement sont correctement configurées sur Vercel
- Vérifiez que la base de données est active dans le tableau de bord Vercel

### Erreur : "Table does not exist"
- Les tables sont créées automatiquement au premier appel
- Vérifiez les logs de l'application pour voir les erreurs de création

## 📚 Ressources

- [Documentation Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Documentation @vercel/postgres](https://www.npmjs.com/package/@vercel/postgres)

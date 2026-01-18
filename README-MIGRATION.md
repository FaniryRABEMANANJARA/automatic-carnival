# Migration vers Vercel Postgres

## Étapes pour migrer vers Postgres

### 1. Créer une base de données Postgres sur Vercel

1. Allez sur votre projet Vercel
2. Cliquez sur l'onglet **Storage**
3. Cliquez sur **Create Database**
4. Sélectionnez **Postgres**
5. Choisissez un nom pour votre base de données
6. Vercel créera automatiquement les variables d'environnement nécessaires

### 2. Variables d'environnement

Vercel configure automatiquement ces variables :
- `POSTGRES_URL` - URL de connexion principale
- `POSTGRES_PRISMA_URL` - URL pour Prisma (si utilisé)
- `POSTGRES_URL_NON_POOLING` - URL sans pooling
- `POSTGRES_USER` - Nom d'utilisateur
- `POSTGRES_HOST` - Hôte de la base de données
- `POSTGRES_PASSWORD` - Mot de passe
- `POSTGRES_DATABASE` - Nom de la base de données

### 3. Migrer les données existantes

Une fois la base de données créée, vous pouvez migrer vos données existantes :

**Option 1 : Via l'API (recommandé)**
```bash
curl -X POST https://votre-app.vercel.app/api/migrate
```

**Option 2 : Via un script local**
```bash
# Assurez-vous d'avoir les variables d'environnement configurées
npm run migrate
```

### 4. Vérifier la migration

Après la migration, vérifiez que toutes vos données sont présentes dans la base de données Postgres.

### 5. Supprimer l'ancien fichier (optionnel)

Une fois que vous êtes assuré que tout fonctionne correctement, vous pouvez supprimer :
- `data/budget.json` (gardez une sauvegarde au cas où)
- `lib/db.ts` (l'ancien fichier lowdb)

## Notes importantes

- Les tables sont créées automatiquement au premier appel de l'API
- Les catégories par défaut sont insérées automatiquement
- La migration préserve tous les IDs existants
- Les données sont migrées avec `ON CONFLICT DO NOTHING` pour éviter les doublons

## Support

Si vous rencontrez des problèmes lors de la migration, vérifiez :
1. Que les variables d'environnement sont correctement configurées
2. Que la base de données Postgres est active sur Vercel
3. Les logs de l'application pour voir les erreurs éventuelles

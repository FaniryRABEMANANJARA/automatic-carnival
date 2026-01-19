# Configuration des Routes

## Routes de l'application

### Routes publiques (pas d'authentification requise)
- `/` - Page d'accueil (redirige vers `/login` ou `/dashboard` selon l'authentification)
- `/login` - Page de connexion
- `/register` - Page d'inscription
- `/api/auth/*` - API d'authentification

### Routes protégées (authentification requise)
- `/dashboard` - **Dashboard** (page principale après connexion)
- `/transactions` - Liste des transactions
- `/income` - Gestion des revenus
- `/expenses` - Gestion des dépenses
- `/categories` - Gestion des catégories
- `/reports` - Rapports et statistiques
- `/settings` - Paramètres de l'application

## Protection des routes

### Niveau serveur (Middleware)
Le fichier `middleware.ts` protège toutes les routes sauf :
- Les routes publiques (`/login`, `/register`, `/api/auth`)
- Les fichiers statiques (`_next/static`, `_next/image`, `favicon.ico`, `assets/`)

### Niveau client (ProtectedRoute)
Toutes les pages protégées utilisent le composant `ProtectedRoute` qui :
- Vérifie l'authentification via `AuthContext`
- Affiche un loader pendant la vérification
- Redirige vers `/login` si l'utilisateur n'est pas authentifié

## Page d'accueil (`/`)

**Fichier**: `app/page.tsx`
**Composant**: `Home()`
**Protection**: ❌ Route publique (redirige selon l'authentification)
**Fonctionnalités**:
- Redirige vers `/login` si l'utilisateur n'est pas authentifié
- Redirige vers `/dashboard` si l'utilisateur est authentifié

## Dashboard (`/dashboard`)

**Fichier**: `app/dashboard/page.tsx`
**Composant**: `DashboardPage()`
**Protection**: ✅ `ProtectedRoute` + `DashboardLayout`
**Fonctionnalités**:
- Vue d'ensemble des finances
- Statistiques (revenus, dépenses, solde)
- Liste des transactions récentes
- Ajout de nouvelles transactions

## Structure des pages protégées

Toutes les pages protégées suivent cette structure :
```tsx
export default function PageName() {
  // ... logique de la page
  
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {/* Contenu de la page */}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
```

## Navigation

Le `Sidebar` contient les liens vers toutes les pages :
- Dashboard → `/dashboard`
- Transactions → `/transactions`
- Revenus → `/income`
- Dépenses → `/expenses`
- Catégories → `/categories`
- Rapports → `/reports`
- Paramètres → `/settings`

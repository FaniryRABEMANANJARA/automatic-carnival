// Ce fichier est maintenant remplacé par lib/db-postgres.ts
// Il est conservé pour compatibilité pendant la migration
// Toutes les routes API utilisent maintenant lib/db-postgres.ts

// Réexporter les types depuis db-postgres pour compatibilité
export type { Transaction, Category } from './db-postgres'

// Les fonctions getDatabase et saveDb ne sont plus utilisées
// Toutes les opérations passent maintenant par les fonctions de db-postgres.ts

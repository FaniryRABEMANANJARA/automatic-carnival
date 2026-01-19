/**
 * Utilitaires de sécurité pour la validation et la sanitization des entrées
 */

// Validation des emails
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

// Validation des mots de passe
export function isValidPassword(password: string): boolean {
  // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password) && password.length <= 128
}

// Sanitization des chaînes de caractères (protection XSS)
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Limiter la longueur
  let sanitized = input.slice(0, maxLength)
  
  // Échapper les caractères HTML dangereux
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
  
  // Supprimer les caractères de contrôle
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')
  
  return sanitized.trim()
}

// Validation des montants
export function isValidAmount(amount: any): boolean {
  if (typeof amount === 'string') {
    amount = parseFloat(amount)
  }
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    return false
  }
  
  // Montant doit être positif et raisonnable (max 1 trillion)
  return amount >= 0 && amount <= 1000000000000
}

// Validation des dates
export function isValidDate(dateString: string): boolean {
  if (typeof dateString !== 'string') {
    return false
  }
  
  const date = new Date(dateString)
  if (isNaN(date.getTime())) {
    return false
  }
  
  // Date doit être entre 1900 et 2100
  const year = date.getFullYear()
  return year >= 1900 && year <= 2100
}

// Validation des types de transaction
export function isValidTransactionType(type: any): type is 'income' | 'expense' {
  return type === 'income' || type === 'expense'
}

// Validation des devises
export function isValidCurrency(currency: any): currency is 'MGA' | 'RMB' {
  return currency === 'MGA' || currency === 'RMB'
}

// Validation des IDs numériques
export function isValidId(id: any): boolean {
  if (typeof id === 'string') {
    id = parseInt(id, 10)
  }
  
  if (typeof id !== 'number' || isNaN(id)) {
    return false
  }
  
  // ID doit être un entier positif
  return Number.isInteger(id) && id > 0 && id <= Number.MAX_SAFE_INTEGER
}

// Validation des mois (1-12)
export function isValidMonth(month: any): boolean {
  if (typeof month === 'string') {
    month = parseInt(month, 10)
  }
  
  if (typeof month !== 'number' || isNaN(month)) {
    return false
  }
  
  return Number.isInteger(month) && month >= 1 && month <= 12
}

// Validation des années
export function isValidYear(year: any): boolean {
  if (typeof year === 'string') {
    year = parseInt(year, 10)
  }
  
  if (typeof year !== 'number' || isNaN(year)) {
    return false
  }
  
  const currentYear = new Date().getFullYear()
  return Number.isInteger(year) && year >= 1900 && year <= currentYear + 10
}

// Validation du jour du mois (1-31)
export function isValidDayOfMonth(day: any): boolean {
  if (typeof day === 'string') {
    day = parseInt(day, 10)
  }
  
  if (typeof day !== 'number' || isNaN(day)) {
    return false
  }
  
  return Number.isInteger(day) && day >= 1 && day <= 31
}

// Validation des noms de catégories
export function isValidCategoryName(name: string): boolean {
  if (typeof name !== 'string') {
    return false
  }
  
  // Nom de catégorie : 1-50 caractères, alphanumériques et espaces
  const categoryRegex = /^[a-zA-Z0-9\s\-_]{1,50}$/
  return categoryRegex.test(name.trim())
}

// Protection contre les attaques par injection SQL (vérification supplémentaire)
export function containsSQLInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false
  }
  
  const sqlKeywords = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/i,
    /('|(\\')|(;)|(\\)|(\/\*)|(\*\/)|(\-\-)|(\#)|(\+)|(\%))/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
  ]
  
  return sqlKeywords.some(pattern => pattern.test(input))
}

// Validation complète d'une transaction
export interface TransactionInput {
  type?: any
  category?: any
  description?: any
  amount?: any
  currency?: any
  date?: any
  income_source?: any
}

export function validateTransactionInput(input: TransactionInput): {
  valid: boolean
  errors: string[]
  sanitized?: {
    type: 'income' | 'expense'
    category: string
    description: string
    amount: number
    currency: 'MGA' | 'RMB'
    date: string
    income_source?: string
  }
} {
  const errors: string[] = []
  
  // Validation du type
  if (!input.type || !isValidTransactionType(input.type)) {
    errors.push('Type de transaction invalide')
  }
  
  // Validation de la catégorie
  if (!input.category || typeof input.category !== 'string') {
    errors.push('Catégorie requise')
  } else if (!isValidCategoryName(input.category)) {
    errors.push('Nom de catégorie invalide')
  } else if (containsSQLInjection(input.category)) {
    errors.push('Catégorie contient des caractères non autorisés')
  }
  
  // Validation du montant
  if (input.amount === undefined || input.amount === null || input.amount === '') {
    errors.push('Montant requis')
  } else if (!isValidAmount(input.amount)) {
    errors.push('Montant invalide')
  }
  
  // Validation de la devise
  if (!input.currency || !isValidCurrency(input.currency)) {
    errors.push('Devise invalide')
  }
  
  // Validation de la date
  if (!input.date || typeof input.date !== 'string') {
    errors.push('Date requise')
  } else if (!isValidDate(input.date)) {
    errors.push('Date invalide')
  }
  
  // Validation de la description (optionnelle mais doit être valide si fournie)
  let description = ''
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description !== 'string') {
      errors.push('Description doit être une chaîne de caractères')
    } else {
      description = sanitizeString(input.description, 500)
      if (containsSQLInjection(description)) {
        errors.push('Description contient des caractères non autorisés')
      }
    }
  }
  
  // Validation de income_source (optionnel)
  let income_source: string | undefined
  if (input.income_source !== undefined && input.income_source !== null && input.income_source !== '') {
    if (typeof input.income_source !== 'string') {
      errors.push('Source de revenu doit être une chaîne de caractères')
    } else {
      income_source = sanitizeString(input.income_source, 200)
      if (containsSQLInjection(income_source)) {
        errors.push('Source de revenu contient des caractères non autorisés')
      }
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors }
  }
  
  return {
    valid: true,
    errors: [],
    sanitized: {
      type: input.type as 'income' | 'expense',
      category: sanitizeString(input.category as string, 50),
      description,
      amount: parseFloat(input.amount as string),
      currency: input.currency as 'MGA' | 'RMB',
      date: input.date as string,
      income_source,
    },
  }
}

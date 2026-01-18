export type Currency = 'MGA' | 'RMB'

// Taux de change (à mettre à jour selon les taux réels)
export const exchangeRates: Record<Currency, number> = {
  MGA: 1, // Devise de base
  RMB: 660, // 1 RMB = 660 MGA
}

// Convertir un montant d'une devise vers MGA
export function convertToMGA(amount: number, fromCurrency: Currency): number {
  if (fromCurrency === 'MGA') {
    return amount
  }
  // Si c'est RMB, multiplier par 660 pour obtenir MGA
  // 1 RMB = 660 MGA, donc amount RMB = amount * 660 MGA
  return amount * exchangeRates[fromCurrency]
}

// Convertir un montant de MGA vers une autre devise
export function convertFromMGA(amount: number, toCurrency: Currency): number {
  if (toCurrency === 'MGA') {
    return amount
  }
  // Si c'est RMB, diviser par 660 pour obtenir RMB
  // 660 MGA = 1 RMB, donc amount MGA = amount / 660 RMB
  return amount / exchangeRates[toCurrency]
}

// Convertir entre deux devises
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number {
  if (fromCurrency === toCurrency) {
    return amount
  }
  const amountInMGA = convertToMGA(amount, fromCurrency)
  return convertFromMGA(amountInMGA, toCurrency)
}

export function formatCurrency(amount: number, currency: Currency = 'MGA'): string {
  if (currency === 'MGA') {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ar`
  } else if (currency === 'RMB') {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return amount.toLocaleString('fr-FR')
}

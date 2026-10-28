const localeByCountry: Record<string, string> = {
  UG: 'en-UG',
  KE: 'en-KE',
  TZ: 'en-TZ',
  RW: 'en-RW',
  US: 'en-US',
  GB: 'en-GB',
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode = 'UGX',
  countryCode = 'UG',
) {
  const numericAmount = Number(amount ?? 0)
  const fractionDigits = currencyCode === 'UGX' ? 0 : 2

  return new Intl.NumberFormat(localeByCountry[countryCode] ?? 'en', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0)
}

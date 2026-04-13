const EUR_BASE_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.09,
  GBP: 0.86,
  BRL: 5.56
};

export function convertFromBaseEur(value: number, targetCurrency: string) {
  const rate = EUR_BASE_RATES[targetCurrency] ?? 1;
  return value * rate;
}

export function formatMoneyConverted(valueInEur: number, lang: string, currency: string, fractionDigits = 2) {
  const converted = convertFromBaseEur(valueInEur, currency);
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(converted);
}

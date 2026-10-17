export type Currency = {
  code: string;
  symbol: string;
  name: string;
  position: 'before' | 'after';
  decimals: number;
};

export const DEFAULT_CURRENCY_CODE = 'GEL';

export const CURRENCIES: Currency[] = [
  { code: 'TRY', symbol: '₺', name: 'Türk Lirası', position: 'after', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'ABD Doları', position: 'before', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', position: 'before', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'İngiliz Sterlini', position: 'before', decimals: 2 },
  { code: 'JPY', symbol: '¥', name: 'Japon Yeni', position: 'before', decimals: 0 },
  { code: 'CNY', symbol: '¥', name: 'Çin Yuanı', position: 'before', decimals: 2 },
  { code: 'RUB', symbol: '₽', name: 'Rus Rublesi', position: 'after', decimals: 2 },
  { code: 'AED', symbol: 'د.إ', name: 'BAE Dirhemi', position: 'after', decimals: 2 },
  { code: 'SAR', symbol: '﷼', name: 'Suudi Arabistan Riyali', position: 'after', decimals: 2 },
  { code: 'CHF', symbol: 'CHF', name: 'İsviçre Frangı', position: 'before', decimals: 2 },
  { code: 'CAD', symbol: 'C$', name: 'Kanada Doları', position: 'before', decimals: 2 },
  { code: 'AUD', symbol: 'A$', name: 'Avustralya Doları', position: 'before', decimals: 2 },
  { code: 'INR', symbol: '₹', name: 'Hindistan Rupisi', position: 'before', decimals: 2 },
  { code: 'AZN', symbol: '₼', name: 'Azerbaycan Manatı', position: 'after', decimals: 2 },
  { code: 'GEL', symbol: '₾', name: 'Gürcü Larisi', position: 'after', decimals: 2 },
  { code: 'KZT', symbol: '₸', name: 'Kazak Tengesi', position: 'after', decimals: 2 },
  { code: 'UAH', symbol: '₴', name: 'Ukrayna Grivnası', position: 'after', decimals: 2 },
  { code: 'PLN', symbol: 'zł', name: 'Polonya Zlotisi', position: 'after', decimals: 2 },
  { code: 'RON', symbol: 'lei', name: 'Romen Leyi', position: 'after', decimals: 2 },
  { code: 'BGN', symbol: 'лв', name: 'Bulgar Levi', position: 'after', decimals: 2 },
  { code: 'SEK', symbol: 'kr', name: 'İsveç Kronu', position: 'after', decimals: 2 },
  { code: 'NOK', symbol: 'kr', name: 'Norveç Kronu', position: 'after', decimals: 2 },
  { code: 'DKK', symbol: 'kr', name: 'Danimarka Kronu', position: 'after', decimals: 2 },
  { code: 'CZK', symbol: 'Kč', name: 'Çek Korunası', position: 'after', decimals: 2 },
  { code: 'HUF', symbol: 'Ft', name: 'Macar Forinti', position: 'after', decimals: 0 },
  { code: 'ILS', symbol: '₪', name: 'İsrail Şekeli', position: 'before', decimals: 2 },
  { code: 'EGP', symbol: 'ج.م', name: 'Mısır Lirası', position: 'after', decimals: 2 },
  { code: 'QAR', symbol: '﷼', name: 'Katar Riyali', position: 'after', decimals: 2 },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuveyt Dinarı', position: 'after', decimals: 2 },
  { code: 'PKR', symbol: '₨', name: 'Pakistan Rupisi', position: 'before', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Endonezya Rupisi', position: 'before', decimals: 0 },
  { code: 'MYR', symbol: 'RM', name: 'Malezya Ringgiti', position: 'before', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapur Doları', position: 'before', decimals: 2 },
  { code: 'KRW', symbol: '₩', name: 'Güney Kore Wonu', position: 'before', decimals: 0 },
  { code: 'BRL', symbol: 'R$', name: 'Brezilya Reali', position: 'before', decimals: 2 },
  { code: 'MXN', symbol: 'MX$', name: 'Meksika Pesosu', position: 'before', decimals: 2 },
  { code: 'ZAR', symbol: 'R', name: 'Güney Afrika Randı', position: 'before', decimals: 2 },
];

export const defaultCurrency: Currency = CURRENCIES.find((c) => c.code === 'GEL')!;

export function currencyByCode(code: string, customs: Currency[] = []): Currency {
  return [...CURRENCIES, ...customs].find((c) => c.code === code) ?? defaultCurrency;
}

export function formatMoney(
  amount: number,
  currency: Currency = defaultCurrency
): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const [intPart, decPart] = abs.toFixed(currency.decimals).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const number = currency.decimals > 0 ? `${grouped},${decPart}` : grouped;
  return currency.position === 'before'
    ? `${sign}${currency.symbol}${number}`
    : `${sign}${number} ${currency.symbol}`;
}

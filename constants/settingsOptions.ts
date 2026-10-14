/**
 * Fallback settings options when API is unavailable.
 * Matches backend API response shape.
 */

export interface CurrencyOption {
  code: string;
  name: string;
}

export interface PhonePrefixOption {
  value: string;
  label: string;
}

export interface UnitOption {
  id: string;
  symbol: string;
  name: string;
}

/** Fallback measurement units */
export const FALLBACK_UNITS: UnitOption[] = [
  { id: 'cm', symbol: 'cm', name: 'Centimetres' },
  { id: 'inch', symbol: '"', name: 'Inches' },
  { id: 'm', symbol: 'm', name: 'Metres' },
  { id: 'mm', symbol: 'mm', name: 'Millimetres' },
  { id: 'ft', symbol: 'ft', name: 'Feet' },
  { id: 'yd', symbol: 'yd', name: 'Yards' },
];

/** Fallback currencies - subset of common ones */
export const FALLBACK_CURRENCIES: CurrencyOption[] = [
  { code: 'RON', name: 'Romanian Leu' },
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'BGN', name: 'Bulgarian Lev' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'RSD', name: 'Serbian Dinar' },
  { code: 'UAH', name: 'Ukrainian Hryvnia' },
  { code: 'MDL', name: 'Moldovan Leu' },
  { code: 'RUB', name: 'Russian Ruble' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'ARS', name: 'Argentine Peso' },
  { code: 'CLP', name: 'Chilean Peso' },
  { code: 'COP', name: 'Colombian Peso' },
  { code: 'PEN', name: 'Peruvian Sol' },
];

/** Fallback phone prefixes */
export const FALLBACK_PHONE_PREFIXES: PhonePrefixOption[] = [
  { value: '', label: 'None' },
  { value: '+40', label: 'Romania (+40)' },
  { value: '+1', label: 'USA/Canada (+1)' },
  { value: '+44', label: 'UK (+44)' },
  { value: '+49', label: 'Germany (+49)' },
  { value: '+33', label: 'France (+33)' },
  { value: '+39', label: 'Italy (+39)' },
  { value: '+34', label: 'Spain (+34)' },
  { value: '+31', label: 'Netherlands (+31)' },
  { value: '+32', label: 'Belgium (+32)' },
  { value: '+41', label: 'Switzerland (+41)' },
  { value: '+43', label: 'Austria (+43)' },
  { value: '+48', label: 'Poland (+48)' },
  { value: '+420', label: 'Czechia (+420)' },
  { value: '+36', label: 'Hungary (+36)' },
  { value: '+359', label: 'Bulgaria (+359)' },
  { value: '+90', label: 'Turkey (+90)' },
  { value: '+381', label: 'Serbia (+381)' },
  { value: '+380', label: 'Ukraine (+380)' },
  { value: '+373', label: 'Moldova (+373)' },
  { value: '+7', label: 'Russia/Kazakhstan (+7)' },
  { value: '+91', label: 'India (+91)' },
  { value: '+86', label: 'China (+86)' },
  { value: '+81', label: 'Japan (+81)' },
  { value: '+82', label: 'South Korea (+82)' },
  { value: '+61', label: 'Australia (+61)' },
  { value: '+64', label: 'New Zealand (+64)' },
  { value: '+55', label: 'Brazil (+55)' },
  { value: '+52', label: 'Mexico (+52)' },
  { value: '+971', label: 'UAE (+971)' },
  { value: '+966', label: 'Saudi Arabia (+966)' },
  { value: '+972', label: 'Israel (+972)' },
  { value: '+20', label: 'Egypt (+20)' },
  { value: '+27', label: 'South Africa (+27)' },
  { value: '+234', label: 'Nigeria (+234)' },
  { value: '+254', label: 'Kenya (+254)' },
];

// i18n Configuration
export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ja';

// Locale display names
export const localeNames: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
};

// Locale flags (for visual representation)
export const localeFlags: Record<Locale, string> = {
  ja: 'JP',
  en: 'US',
};

// Check if a locale is valid
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

// Get locale from browser or fallback to default
export function getPreferredLocale(acceptLanguage?: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  // Parse Accept-Language header
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = 'q=1'] = lang.trim().split(';');
      return {
        code: code.split('-')[0].toLowerCase(),
        quality: parseFloat(q.replace('q=', '')),
      };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { code } of languages) {
    if (isValidLocale(code)) {
      return code;
    }
  }

  return defaultLocale;
}

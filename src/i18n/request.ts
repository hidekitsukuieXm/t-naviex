import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isValidLocale, type Locale } from './config';

export const LOCALE_COOKIE_NAME = 't-naviex-locale';

export default getRequestConfig(async () => {
  // Try to get locale from cookie
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  let locale: Locale = defaultLocale;

  if (localeCookie && isValidLocale(localeCookie)) {
    locale = localeCookie;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});

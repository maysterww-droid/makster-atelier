import { cookies, headers } from 'next/headers';
import { normalizeLocale, OWNER_DEFAULT_LOCALE, type Locale } from './i18n';

const COOKIE_NAME = 'mq_locale';

export async function getInterfaceLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const saved = cookieStore.get(COOKIE_NAME)?.value;
  if (saved) return normalizeLocale(saved);

  const acceptLanguage = (await headers()).get('accept-language');
  const preferred = acceptLanguage?.split(',')[0]?.trim();
  return preferred ? normalizeLocale(preferred) : OWNER_DEFAULT_LOCALE;
}

export const INTERFACE_LOCALE_COOKIE = COOKIE_NAME;

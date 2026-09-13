'use client';

import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import styles from './site-chrome.module.css';

const COOKIE_NAME = 'mq_locale';
const options: Array<{ value: Locale; label: string }> = [
  { value: 'ru', label: 'RU' },
  { value: 'en', label: 'EN' },
  { value: 'cs', label: 'CS' },
  { value: 'de', label: 'DE' },
  { value: 'pl', label: 'PL' },
];

export function MarketingLocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();

  return (
    <label className={styles.localeSwitcher}>
      <span>{label}</span>
      <select
        aria-label={label}
        value={locale}
        onChange={(event) => {
          const nextLocale = event.target.value as Locale;
          document.cookie = `${COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
          router.push(`/${nextLocale}${window.location.hash}`);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { INTERFACE_LOCALE_COOKIE } from '@/lib/interface-locale';
import type { Locale } from '@/lib/i18n';

const options: Array<{ value: Locale; label: string }> = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' },
  { value: 'cs', label: 'Čeština' },
  { value: 'de', label: 'Deutsch' },
  { value: 'pl', label: 'Polski' },
];

export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  return <label className="localeSwitcher">
    <span>{label}</span>
    <select
      value={locale}
      onChange={(event) => {
        document.cookie = `${INTERFACE_LOCALE_COOKIE}=${event.target.value}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

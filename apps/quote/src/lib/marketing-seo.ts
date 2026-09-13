import type { Metadata } from 'next';
import { SUPPORTED_LOCALES, type Locale } from './i18n';

const DEFAULT_ORIGIN = 'https://quote.maksteratelier.com';

const seo: Record<Locale, { title: string; description: string; ogLocale: string }> = {
  ru: {
    title: 'Makster Quote — расчёт мебели, себестоимость и маржа',
    description: 'Считайте конструкцию мебели, реальную себестоимость, маржу и цену клиенту по закупочным ценам вашей мастерской.',
    ogLocale: 'ru_RU',
  },
  en: {
    title: 'Makster Quote — furniture costing and margins',
    description: 'Calculate furniture construction, true cost, margin and customer pricing with your workshop’s actual purchase prices.',
    ogLocale: 'en_GB',
  },
  cs: {
    title: 'Makster Quote — kalkulace nábytku a marže',
    description: 'Počítejte konstrukci nábytku, skutečné náklady, marži a cenu pro zákazníka podle nákupních cen vaší dílny.',
    ogLocale: 'cs_CZ',
  },
  de: {
    title: 'Makster Quote — Möbelkalkulation und Marge',
    description: 'Kalkulieren Sie Möbelkonstruktion, Vollkosten, Marge und Kundenpreis mit den realen Einkaufspreisen Ihrer Werkstatt.',
    ogLocale: 'de_DE',
  },
  pl: {
    title: 'Makster Quote — wycena mebli i marża',
    description: 'Obliczaj konstrukcję mebli, pełny koszt, marżę i cenę dla klienta według rzeczywistych cen zakupu warsztatu.',
    ogLocale: 'pl_PL',
  },
};

export function getMarketingOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return DEFAULT_ORIGIN;

  try {
    const url = new URL(configured);
    return url.protocol === 'https:' || url.hostname === 'localhost' ? url.origin : DEFAULT_ORIGIN;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

export function getMarketingAlternates(locale: Locale) {
  return {
    canonical: `/${locale}`,
    languages: {
      'x-default': '/',
      ...Object.fromEntries(SUPPORTED_LOCALES.map((item) => [item, `/${item}`])),
    },
  };
}

export function getMarketingMetadata(locale: Locale, canonical: string = `/${locale}`): Metadata {
  const entry = seo[locale] ?? seo.en;
  const alternateLocales = SUPPORTED_LOCALES
    .filter((item) => item !== locale)
    .map((item) => seo[item].ogLocale);

  return {
    title: { absolute: entry.title },
    description: entry.description,
    alternates: {
      ...getMarketingAlternates(locale),
      canonical,
    },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      siteName: 'Makster Quote',
      title: entry.title,
      description: entry.description,
      url: canonical,
      locale: entry.ogLocale,
      alternateLocale: alternateLocales,
    },
    twitter: {
      card: 'summary',
      title: entry.title,
      description: entry.description,
    },
  };
}

export function getMarketingSeoText(locale: Locale) {
  return seo[locale] ?? seo.en;
}

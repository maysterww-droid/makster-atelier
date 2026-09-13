import type { Locale } from './i18n';

export type BillingRuntimeMessages = {
  eyebrow: string;
  backendReady: string;
  backendSetup: string;
  testMode: string;
  liveState: string;
  modeTest: string;
  modeLiveOrUnset: string;
};

const messages: Record<Locale, BillingRuntimeMessages> = {
  ru: {
    eyebrow: 'БИЛЛИНГ · MAKSTER QUOTE',
    backendReady: 'Готово',
    backendSetup: 'Настройка',
    testMode: 'Тестовый режим Lemon Squeezy',
    liveState: 'Состояние live billing',
    modeTest: 'тестовый',
    modeLiveOrUnset: 'live / не задано',
  },
  en: {
    eyebrow: 'BILLING · MAKSTER QUOTE',
    backendReady: 'Ready',
    backendSetup: 'Setup',
    testMode: 'Lemon Squeezy test mode',
    liveState: 'Live billing state',
    modeTest: 'test',
    modeLiveOrUnset: 'live / not set',
  },
  cs: {
    eyebrow: 'FAKTURACE · MAKSTER QUOTE',
    backendReady: 'Připraveno',
    backendSetup: 'Nastavení',
    testMode: 'Testovací režim Lemon Squeezy',
    liveState: 'Stav live fakturace',
    modeTest: 'test',
    modeLiveOrUnset: 'live / nenastaveno',
  },
  de: {
    eyebrow: 'ABRECHNUNG · MAKSTER QUOTE',
    backendReady: 'Bereit',
    backendSetup: 'Einrichtung',
    testMode: 'Lemon-Squeezy-Testmodus',
    liveState: 'Live-Abrechnungsstatus',
    modeTest: 'Test',
    modeLiveOrUnset: 'live / nicht gesetzt',
  },
  pl: {
    eyebrow: 'ROZLICZENIA · MAKSTER QUOTE',
    backendReady: 'Gotowe',
    backendSetup: 'Konfiguracja',
    testMode: 'Tryb testowy Lemon Squeezy',
    liveState: 'Stan live billing',
    modeTest: 'test',
    modeLiveOrUnset: 'live / nie ustawiono',
  },
};

export function getBillingRuntimeMessages(locale: Locale): BillingRuntimeMessages {
  return messages[locale] ?? messages.en;
}

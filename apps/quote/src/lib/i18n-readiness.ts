import type { Locale } from './i18n';

export type ReadinessEnvironmentMessages = {
  supabasePublicLabel: string;
  supabasePublicReady: string;
  supabasePublicMissing: string;
  appUrlLabel: string;
  appUrlReady: string;
  appUrlMissing: string;
  emailLabel: string;
  emailReady: string;
  emailMissing: string;
  serverDbLabel: string;
  serverDbReady: string;
  serverDbMissing: string;
  lemonWebhookLabel: string;
  lemonWebhookReady: string;
  lemonWebhookMissing: string;
  lemonCheckoutLabel: string;
  lemonCheckoutReady: string;
  lemonCheckoutMissing: string;
};

const messages: Record<Locale, ReadinessEnvironmentMessages> = {
  ru: {
    supabasePublicLabel: 'Подключение Supabase',
    supabasePublicReady: 'Публичные данные подключения приложения настроены.',
    supabasePublicMissing: 'Не хватает URL Supabase или publishable key.',
    appUrlLabel: 'Канонический адрес приложения',
    appUrlReady: 'HTTPS-адрес настроен для ссылок и перенаправлений.',
    appUrlMissing: 'NEXT_PUBLIC_APP_URL должен содержать итоговый HTTPS-адрес Makster Quote.',
    emailLabel: 'Отправка email',
    emailReady: 'Ключ Resend и адрес отправителя настроены.',
    emailMissing: 'Не настроен RESEND_API_KEY и/или QUOTE_EMAIL_FROM.',
    serverDbLabel: 'Доверенный серверный доступ к базе',
    serverDbReady: 'Серверный доступ доступен для проверенных фоновых операций.',
    serverDbMissing: 'SUPABASE_SERVICE_ROLE_KEY нужен перед запуском live billing webhook.',
    lemonWebhookLabel: 'Webhook Lemon Squeezy',
    lemonWebhookReady: 'Webhook secret и доверенный серверный доступ настроены.',
    lemonWebhookMissing: 'Не настроен webhook secret Lemon Squeezy и/или доверенный доступ Supabase.',
    lemonCheckoutLabel: 'Варианты платных тарифов',
    lemonCheckoutReady: 'Founder, Pro и Workshop настроены для checkout.',
    lemonCheckoutMissing: 'Не хватает одного или нескольких variant ID Lemon Squeezy для Founder / Pro / Workshop.',
  },
  en: {
    supabasePublicLabel: 'Supabase app connection',
    supabasePublicReady: 'Public application credentials are configured.',
    supabasePublicMissing: 'Supabase URL or publishable key is missing.',
    appUrlLabel: 'Canonical app URL',
    appUrlReady: 'HTTPS origin is configured for quote links and redirects.',
    appUrlMissing: 'NEXT_PUBLIC_APP_URL must contain the final HTTPS Makster Quote URL.',
    emailLabel: 'Email delivery',
    emailReady: 'Resend key and sender are configured.',
    emailMissing: 'RESEND_API_KEY and/or QUOTE_EMAIL_FROM are missing.',
    serverDbLabel: 'Trusted server database access',
    serverDbReady: 'Trusted server access is available for verified background operations.',
    serverDbMissing: 'SUPABASE_SERVICE_ROLE_KEY is required before live billing webhooks.',
    lemonWebhookLabel: 'Lemon Squeezy webhook',
    lemonWebhookReady: 'Webhook secret and trusted server access are configured.',
    lemonWebhookMissing: 'Lemon Squeezy webhook secret and/or trusted Supabase access are missing.',
    lemonCheckoutLabel: 'Paid plan checkout variants',
    lemonCheckoutReady: 'Founder, Pro and Workshop checkout variants are configured.',
    lemonCheckoutMissing: 'One or more Lemon Squeezy variant IDs for Founder / Pro / Workshop are missing.',
  },
  cs: {
    supabasePublicLabel: 'Připojení Supabase',
    supabasePublicReady: 'Veřejné údaje připojení aplikace jsou nastavené.',
    supabasePublicMissing: 'Chybí URL Supabase nebo publishable key.',
    appUrlLabel: 'Kanonická adresa aplikace',
    appUrlReady: 'HTTPS adresa je nastavená pro odkazy a přesměrování.',
    appUrlMissing: 'NEXT_PUBLIC_APP_URL musí obsahovat finální HTTPS adresu Makster Quote.',
    emailLabel: 'Odesílání e-mailů',
    emailReady: 'Klíč Resend a adresa odesílatele jsou nastavené.',
    emailMissing: 'Chybí RESEND_API_KEY a/nebo QUOTE_EMAIL_FROM.',
    serverDbLabel: 'Důvěryhodný serverový přístup k databázi',
    serverDbReady: 'Serverový přístup je dostupný pro ověřené operace na pozadí.',
    serverDbMissing: 'SUPABASE_SERVICE_ROLE_KEY je potřeba před spuštěním live billing webhooků.',
    lemonWebhookLabel: 'Webhook Lemon Squeezy',
    lemonWebhookReady: 'Webhook secret a důvěryhodný serverový přístup jsou nastavené.',
    lemonWebhookMissing: 'Chybí webhook secret Lemon Squeezy a/nebo důvěryhodný přístup Supabase.',
    lemonCheckoutLabel: 'Varianty placených tarifů',
    lemonCheckoutReady: 'Founder, Pro a Workshop jsou nastavené pro checkout.',
    lemonCheckoutMissing: 'Chybí jeden nebo více variant ID Lemon Squeezy pro Founder / Pro / Workshop.',
  },
  de: {
    supabasePublicLabel: 'Supabase-Verbindung',
    supabasePublicReady: 'Die öffentlichen Verbindungsdaten der Anwendung sind konfiguriert.',
    supabasePublicMissing: 'Supabase-URL oder Publishable Key fehlt.',
    appUrlLabel: 'Kanonische App-URL',
    appUrlReady: 'Die HTTPS-Adresse ist für Links und Weiterleitungen konfiguriert.',
    appUrlMissing: 'NEXT_PUBLIC_APP_URL muss die endgültige HTTPS-Adresse von Makster Quote enthalten.',
    emailLabel: 'E-Mail-Versand',
    emailReady: 'Resend-Key und Absenderadresse sind konfiguriert.',
    emailMissing: 'RESEND_API_KEY und/oder QUOTE_EMAIL_FROM fehlen.',
    serverDbLabel: 'Vertrauenswürdiger Server-Datenbankzugriff',
    serverDbReady: 'Serverzugriff ist für geprüfte Hintergrundprozesse verfügbar.',
    serverDbMissing: 'SUPABASE_SERVICE_ROLE_KEY wird vor Live-Billing-Webhooks benötigt.',
    lemonWebhookLabel: 'Lemon-Squeezy-Webhook',
    lemonWebhookReady: 'Webhook-Secret und vertrauenswürdiger Serverzugriff sind konfiguriert.',
    lemonWebhookMissing: 'Lemon-Squeezy-Webhook-Secret und/oder vertrauenswürdiger Supabase-Zugriff fehlen.',
    lemonCheckoutLabel: 'Varianten der Bezahlpläne',
    lemonCheckoutReady: 'Founder, Pro und Workshop sind für den Checkout konfiguriert.',
    lemonCheckoutMissing: 'Eine oder mehrere Lemon-Squeezy-Variant-IDs für Founder / Pro / Workshop fehlen.',
  },
  pl: {
    supabasePublicLabel: 'Połączenie z Supabase',
    supabasePublicReady: 'Publiczne dane połączenia aplikacji są skonfigurowane.',
    supabasePublicMissing: 'Brakuje adresu URL Supabase lub publishable key.',
    appUrlLabel: 'Kanoniczny adres aplikacji',
    appUrlReady: 'Adres HTTPS jest skonfigurowany dla linków i przekierowań.',
    appUrlMissing: 'NEXT_PUBLIC_APP_URL musi zawierać docelowy adres HTTPS Makster Quote.',
    emailLabel: 'Wysyłka e-mail',
    emailReady: 'Klucz Resend i adres nadawcy są skonfigurowane.',
    emailMissing: 'Brakuje RESEND_API_KEY i/lub QUOTE_EMAIL_FROM.',
    serverDbLabel: 'Zaufany dostęp serwera do bazy danych',
    serverDbReady: 'Dostęp serwerowy jest dostępny dla zweryfikowanych operacji w tle.',
    serverDbMissing: 'SUPABASE_SERVICE_ROLE_KEY jest wymagany przed uruchomieniem live billing webhooków.',
    lemonWebhookLabel: 'Webhook Lemon Squeezy',
    lemonWebhookReady: 'Webhook secret i zaufany dostęp serwerowy są skonfigurowane.',
    lemonWebhookMissing: 'Brakuje webhook secret Lemon Squeezy i/lub zaufanego dostępu do Supabase.',
    lemonCheckoutLabel: 'Warianty płatnych planów',
    lemonCheckoutReady: 'Founder, Pro i Workshop są skonfigurowane do checkoutu.',
    lemonCheckoutMissing: 'Brakuje co najmniej jednego variant ID Lemon Squeezy dla Founder / Pro / Workshop.',
  },
};

export function getReadinessEnvironmentMessages(locale: Locale): ReadinessEnvironmentMessages {
  return messages[locale] ?? messages.en;
}

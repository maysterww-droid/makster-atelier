import type { Locale } from './i18n';

type AuthSignupErrors = {
  emailNotAuthorized: string;
  rateLimited: string;
};

const messages: Record<Locale, AuthSignupErrors> = {
  ru: {
    emailNotAuthorized: 'Отправка писем подтверждения пока ограничена настройками почты. Подключите рабочий SMTP и повторите регистрацию.',
    rateLimited: 'Слишком много писем подтверждения за короткое время. Попробуйте позже.',
  },
  en: {
    emailNotAuthorized: 'Confirmation emails are currently restricted by the email provider settings. Configure production SMTP and try again.',
    rateLimited: 'Too many confirmation emails were requested in a short time. Try again later.',
  },
  cs: {
    emailNotAuthorized: 'Odesílání potvrzovacích e-mailů je nyní omezené nastavením poskytovatele pošty. Nastavte produkční SMTP a zkuste registraci znovu.',
    rateLimited: 'Během krátké doby bylo vyžádáno příliš mnoho potvrzovacích e-mailů. Zkuste to později.',
  },
  de: {
    emailNotAuthorized: 'Bestätigungs-E-Mails sind derzeit durch die Einstellungen des E-Mail-Anbieters eingeschränkt. Richten Sie das produktive SMTP ein und versuchen Sie die Registrierung erneut.',
    rateLimited: 'In kurzer Zeit wurden zu viele Bestätigungs-E-Mails angefordert. Bitte später erneut versuchen.',
  },
  pl: {
    emailNotAuthorized: 'Wysyłanie wiadomości potwierdzających jest obecnie ograniczone ustawieniami dostawcy poczty. Skonfiguruj produkcyjny SMTP i spróbuj ponownie.',
    rateLimited: 'W krótkim czasie wysłano zbyt wiele próśb o wiadomość potwierdzającą. Spróbuj ponownie później.',
  },
};

export function getAuthSignupErrors(locale: Locale) {
  return messages[locale];
}

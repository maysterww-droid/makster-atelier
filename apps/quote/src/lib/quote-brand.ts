export type QuoteBrandSettings = {
  tradeName: string;
  legalName: string;
  registrationId: string;
  vatId: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  bankAccount: string;
  iban: string;
  footerText: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function readQuoteBrand(settings: unknown, fallbackName: string): QuoteBrandSettings {
  const root = record(settings);
  const brand = record(root.quoteBrand);
  const companyName = text(brand.tradeName, fallbackName) || fallbackName;

  return {
    tradeName: companyName,
    legalName: text(brand.legalName, companyName),
    registrationId: text(brand.registrationId),
    vatId: text(brand.vatId),
    address: text(brand.address),
    email: text(brand.email),
    phone: text(brand.phone),
    website: text(brand.website),
    bankAccount: text(brand.bankAccount),
    iban: text(brand.iban),
    footerText: text(brand.footerText),
  };
}

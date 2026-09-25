import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteMotion } from "./site-motion";
import { siteUrl } from "./seo";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Makster Atelier | Nábytek na míru v Praze",
    template: "%s | Makster Atelier",
  },
  description:
    "Prémiové kuchyně, vestavěné skříně a kompletní interiéry na míru. Česká výroba, odborná doprava a montáž po Evropě.",
  keywords: [
    "nábytek na míru Praha",
    "kuchyně na míru Praha",
    "vestavěné skříně",
    "zakázková výroba nábytku",
    "Makster Atelier",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: "Makster Atelier",
    title: "MAKSTER ATELIER | Nábytek na míru bez kompromisů",
    description:
      "Kuchyně, vestavěné skříně a kompletní nábytkové celky na míru. Výroba v České republice.",
    url: "/",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  category: "furniture",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080908",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "Organization"],
  "@id": `${siteUrl}/#atelier`,
  name: "Makster Atelier",
  url: siteUrl,
  logo: `${siteUrl}/media/brand-logo.webp`,
  image: `${siteUrl}/media/projects/kitchen-oak-light-cover.webp`,
  description:
    "Prémiové kuchyně, vestavěné skříně a kompletní interiéry na míru z české výroby.",
  email: "info@maksteratelier.com",
  telephone: "+420720472811",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Praha",
    addressCountry: "CZ",
  },
  areaServed: [
    { "@type": "Country", name: "Česká republika" },
    { "@type": "AdministrativeArea", name: "Evropa" },
  ],
  knowsLanguage: ["cs", "ru", "uk", "en", "pl", "de"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="cs">
      <body>
        {children}
        <SiteMotion />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </body>
    </html>
  );
}

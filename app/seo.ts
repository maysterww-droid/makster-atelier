import type { Metadata } from "next";

export const siteUrl = "https://www.maksteratelier.com";

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
};

export function createPageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: index },
    openGraph: {
      type: "website",
      locale: "cs_CZ",
      siteName: "Makster Atelier",
      title,
      description,
      url: path,
    },
  };
}

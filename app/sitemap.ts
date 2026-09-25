import type { MetadataRoute } from "next";
import { portfolioProjects } from "./portfolio-data";
import { siteUrl } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${siteUrl}/realizace`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/sluzby`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/materialy`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/o-nas`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/jak-pracujeme`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/kontakt`, changeFrequency: "monthly", priority: 0.8 },
  ];

  const projects: MetadataRoute.Sitemap = portfolioProjects.map(({ slug }) => ({
    url: `${siteUrl}/realizace/${slug}`,
    changeFrequency: "yearly",
    priority: 0.7,
  }));

  return [...pages, ...projects];
}

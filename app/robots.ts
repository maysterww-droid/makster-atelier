import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/planner"],
    },
    sitemap: "https://www.maksteratelier.com/sitemap.xml",
    host: "https://www.maksteratelier.com",
  };
}

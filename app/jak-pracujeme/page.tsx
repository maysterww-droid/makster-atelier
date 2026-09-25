import EditorialPage from "../editorial-page";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Jak pracujeme",
  description: "Od konzultace a zaměření přes technickou přípravu a výrobu až po přesnou montáž a předání interiéru.",
  path: "/jak-pracujeme",
});

export default function Page() { return <EditorialPage kind="process" />; }

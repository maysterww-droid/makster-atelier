import EditorialPage from "../editorial-page";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Kontakt a nezávazná konzultace",
  description: "Kontaktujte Makster Atelier v Praze a proberte s námi kuchyň, vestavěnou skříň nebo kompletní interiér na míru.",
  path: "/kontakt",
});

export default function Page() { return <EditorialPage kind="contact" />; }

import EditorialPage from "../editorial-page";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "O ateliéru",
  description: "Poznejte Makster Atelier — tým, který osobně odpovídá za návrh, výrobu, dopravu a montáž nábytku na míru.",
  path: "/o-nas",
});

export default function Page() { return <EditorialPage kind="about" />; }

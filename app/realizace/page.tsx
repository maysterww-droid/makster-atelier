import EditorialPage from "../editorial-page";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Realizace nábytku na míru",
  description: "Prohlédněte si skutečné realizace kuchyní, vestavěných skříní a kompletních interiérů od Makster Atelier.",
  path: "/realizace",
});

export default function Page() { return <EditorialPage kind="projects" />; }

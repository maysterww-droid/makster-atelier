import EditorialPage from "../editorial-page";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Materiály, pracovní desky a kování",
  description: "Povrchy, pracovní desky, nábytkové kování a řemeslné detaily vybírané pro vzhled, odolnost a dlouhou životnost.",
  path: "/materialy",
});

export default function Page() { return <EditorialPage kind="materials" />; }

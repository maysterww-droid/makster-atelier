import EditorialPage from "../editorial-page";
import { createPageMetadata } from "../seo";

export const metadata = createPageMetadata({
  title: "Kuchyně a nábytek na míru v Praze",
  description: "Navrhujeme a vyrábíme kuchyně, vestavěné skříně, šatny i kompletní nábytkové celky na míru.",
  path: "/sluzby",
});

export default function Page() { return <EditorialPage kind="services" />; }

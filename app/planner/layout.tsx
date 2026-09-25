import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dream Planner",
  description: "Připravovaný plánovač kuchyní Makster Atelier.",
  alternates: { canonical: "/planner" },
  robots: { index: false, follow: false },
};

export default function PlannerLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

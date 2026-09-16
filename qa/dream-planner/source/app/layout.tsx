import "./globals.css";
export const metadata = {
  title: "MAKSTER ATELIER — Dream Planner v3",
  description: "Photorealistic 3D kitchen planner prepared for GLB model."
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}

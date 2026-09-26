import type { ReactNode } from "react";
import Link from "next/link";

export function PlannerControl({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Link
      href="/planner"
      className={`${className} planner-highlight`.trim()}
      data-analytics="dream-planner"
    >
      {children}
    </Link>
  );
}

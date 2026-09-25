import type { ReactNode } from "react";

export function PlannerControl({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`${className} planner-disabled`.trim()}
      role="link"
      aria-disabled="true"
    >
      {children}
    </span>
  );
}

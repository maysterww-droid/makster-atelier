"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    va?: (...args: unknown[]) => void;
    vaq?: unknown[][];
  }
}

type MaksterEvent =
  | "dream_planner_click"
  | "planner_notify_click"
  | "planner_consultation_click"
  | "quote_click"
  | "phone_click"
  | "email_click"
  | "whatsapp_click"
  | "enquiry_submitted";

export function trackMaksterEvent(event: MaksterEvent, properties?: Record<string, string>) {
  window.va?.("event", { name: event, data: properties });
}

export function InteractionAnalytics() {
  useEffect(() => {
    if (!window.va) {
      window.va = (...args: unknown[]) => {
        window.vaq = window.vaq || [];
        window.vaq.push(args);
      };
    }

    const analyticsScript = document.createElement("script");
    analyticsScript.defer = true;
    analyticsScript.src = "/_vercel/insights/script.js";
    analyticsScript.dataset.sdkn = "makster-atelier";
    document.head.appendChild(analyticsScript);

    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;

      const href = link.getAttribute("href") || "";
      const source = window.location.pathname;

      if (link.dataset.analytics === "planner-notify") {
        trackMaksterEvent("planner_notify_click", { source });
      } else if (link.dataset.analytics === "planner-consultation") {
        trackMaksterEvent("planner_consultation_click", { source });
      } else if (link.dataset.analytics === "dream-planner" || href === "/planner") {
        trackMaksterEvent("dream_planner_click", { source });
      } else if (href.startsWith("https://quote.maksteratelier.com")) {
        trackMaksterEvent("quote_click", { source });
      } else if (href.startsWith("tel:")) {
        trackMaksterEvent("phone_click", { source });
      } else if (href.startsWith("mailto:")) {
        trackMaksterEvent("email_click", { source });
      } else if (href.startsWith("https://wa.me/")) {
        trackMaksterEvent("whatsapp_click", { source });
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      analyticsScript.remove();
    };
  }, []);

  return null;
}

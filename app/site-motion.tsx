"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const revealSelector = [
  ".proof-card",
  ".section-heading",
  ".project-card",
  ".service-visual-list > a",
  ".materials-image",
  ".materials-copy",
  ".team-grid article",
  ".home-process-grid > a",
  ".b2b-image",
  ".b2b-copy",
  ".quote-card",
  ".contact-copy",
  ".contact-form",
  ".exact-section-head",
  ".exact-service-card",
  ".exact-route article",
  ".exact-statement",
  ".exact-process-step",
  ".exact-material-panel",
  ".material-library-card",
  ".material-samples",
  ".material-criteria article",
  ".project-art-card",
  ".exact-team-grid article",
  ".responsibility article",
  ".contact-exact-intro",
  ".contact-art-form",
  ".contact-direct",
].join(",");

export function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("motion-ready");

    const elements = Array.from(document.querySelectorAll<HTMLElement>(revealSelector));
    elements.forEach((element, index) => {
      element.classList.add("motion-reveal");
      element.style.setProperty("--motion-delay", `${Math.min((index % 6) * 65, 325)}ms`);
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return () => root.classList.remove("motion-ready");
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -9%", threshold: 0.08 });

    elements.forEach((element) => observer.observe(element));

    return () => {
      observer.disconnect();
      elements.forEach((element) => {
        element.classList.remove("motion-reveal", "is-visible");
        element.style.removeProperty("--motion-delay");
      });
      root.classList.remove("motion-ready");
    };
  }, [pathname]);

  return null;
}

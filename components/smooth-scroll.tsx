"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function SmoothScroll() {
  const pathname = usePathname();
  useEffect(() => {
    let disposed = false;
    let generation = 0;
    let destroy: (() => void) | undefined;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    async function configure() {
      const current = ++generation;
      destroy?.();
      destroy = undefined;
      document.documentElement.dataset.scrollMode = "native";
      if (preference.matches || window.matchMedia("(pointer: coarse)").matches) return;
      const { default: Lenis } = await import("lenis");
      if (disposed || current !== generation || preference.matches) return;
      const lenis = new Lenis({
        autoRaf: true,
        lerp: 0.12,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -96 },
        allowNestedScroll: true,
        prevent: (node) => Boolean(document.querySelector('[role="dialog"]')) || Boolean(node.closest('textarea,input,[data-lenis-prevent]')),
      });
      document.documentElement.dataset.scrollMode = "smooth";
      destroy = () => lenis.destroy();
    }
    void configure();
    preference.addEventListener("change", configure);
    return () => {
      disposed = true;
      preference.removeEventListener("change", configure);
      destroy?.();
      delete document.documentElement.dataset.scrollMode;
    };
  }, [pathname]);
  return null;
}

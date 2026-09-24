"use client";

import { useEffect } from "react";

export function SmoothScroll() {
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
    const reconfigure = () => { void configure().catch(() => { if (!disposed) document.documentElement.dataset.scrollMode = "native"; }); };
    reconfigure();
    preference.addEventListener("change", reconfigure);
    return () => {
      disposed = true;
      preference.removeEventListener("change", reconfigure);
      destroy?.();
      delete document.documentElement.dataset.scrollMode;
    };
  }, []);
  return null;
}

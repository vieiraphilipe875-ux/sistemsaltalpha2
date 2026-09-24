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
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"), import("gsap"), import("gsap/ScrollTrigger"),
      ]);
      if (disposed || current !== generation || preference.matches) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({
        autoRaf: false,
        lerp: 0.12,
        smoothWheel: true,
        syncTouch: false,
        anchors: { offset: -96 },
        allowNestedScroll: true,
        prevent: (node) => Boolean(document.querySelector('[role="dialog"]')) || Boolean(node.closest('textarea,input,[data-lenis-prevent]')),
      });
      // Advance scrolling before GSAP renders so pins and the rail share one frame.
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.add(tick, false, true);
      document.documentElement.dataset.scrollMode = "smooth";
      destroy = () => {
        gsap.ticker.remove(tick);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
        gsap.ticker.lagSmoothing(500, 33);
      };
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

"use client";

import { useEffect } from "react";

export function MarketingMotion() {
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    async function setup() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (disposed) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        const context = gsap.context(() => {
          gsap.from("[data-hero-line]", { yPercent: 108, duration: 1.05, stagger: 0.1, ease: "power4.out" });
          gsap.from(".landing-hero-bottom", { opacity: 0, y: 18, duration: 0.8, delay: 0.25, ease: "power3.out" });
          gsap.fromTo(".hero-product", { scale: 0.94, rotate: 1.6 }, { scale: 1, rotate: 0, ease: "none", scrollTrigger: { trigger: ".hero-product", start: "top 95%", end: "top 15%", scrub: 0.7 } });
          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
            gsap.from(element, { y: 32, opacity: 0, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 94%", once: true } });
          });
          gsap.fromTo(".mission-word", { color: "#67716a" }, { color: "#f4f6f3", stagger: 0.07, ease: "none", scrollTrigger: { trigger: ".landing-mission h2", start: "top 84%", end: "bottom 45%", scrub: 0.5 } });
        }, "#postito-landing");
        return () => context.revert();
      });
      const refresh = () => ScrollTrigger.refresh();
      document.querySelectorAll<HTMLImageElement>("#postito-landing img").forEach((img) => img.addEventListener("load", refresh));
      cleanup = () => {
        document.querySelectorAll<HTMLImageElement>("#postito-landing img").forEach((img) => img.removeEventListener("load", refresh));
        media.revert();
      };
    }
    void setup();
    return () => { disposed = true; cleanup?.(); };
  }, []);
  return null;
}

"use client";

import { useEffect } from "react";

export function MarketingMotion() {
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    async function setup() {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      const root = document.getElementById("postito-landing");
      if (disposed || !root) return;
      gsap.registerPlugin(ScrollTrigger);
      const media = gsap.matchMedia(root);
      let refreshFrame = 0;
      let refreshPending = false;
      const flushRefresh = () => {
        if (disposed || !refreshPending || ScrollTrigger.isScrolling()) return;
        refreshPending = false;
        ScrollTrigger.refresh(true);
      };
      const refresh = () => {
        refreshPending = true;
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(flushRefresh);
      };
      const details = [...root.querySelectorAll("details")];
      const observer = new ResizeObserver(refresh);
      ScrollTrigger.addEventListener("scrollEnd", flushRefresh);
      cleanup = () => {
        cancelAnimationFrame(refreshFrame);
        observer.disconnect();
        ScrollTrigger.removeEventListener("scrollEnd", flushRefresh);
        details.forEach(detail => detail.removeEventListener("toggle", refresh));
        media.revert();
        delete root.dataset.motion;
        delete root.dataset.motionLayout;
        delete root.dataset.intro;
      };
      media.add({
        motion: "(prefers-reduced-motion: no-preference)",
        desktop: "(min-width: 900px) and (min-height: 650px) and (pointer: fine)",
        always: "(min-width: 0px)",
      }, context => {
        const { motion, desktop } = context.conditions!;
        root.dataset.motion = motion ? "full" : "reduced";
        root.dataset.motionLayout = motion && desktop ? "desktop" : "native";
        if (!motion) return;
        const listeners: (() => void)[] = [];
        const flow = root.querySelector<HTMLElement>(".landing-flow")!;
        delete root.dataset.intro;
        const intro = gsap.timeline({ defaults: { ease: "power4.out" }, onComplete: () => {
          gsap.set(root.querySelectorAll("[data-hero-line] .motion-char"), { clearProps: "all" });
          root.dataset.intro = "ready";
        } });
        intro.from("[data-hero-line] .motion-char", { yPercent: 115, rotationX: -65, transformOrigin: "50% 100%", duration: 1.05, stagger: 0.025 })
          .from(".hero-order", { rotation: 5, duration: 1.2 }, 0.15)
          .from(".landing-hero-bottom", { y: 28, opacity: 0, duration: 0.8 }, 0.45);

        if (desktop) {
          const hero = gsap.timeline({ scrollTrigger: {
            id: "landing-product", trigger: ".hero-product-stage", start: "top 104px", end: () => "+=" + window.innerHeight * 0.95,
            pin: true, scrub: true, invalidateOnRefresh: true,
          } });
          hero.fromTo(".hero-product", { scale: 0.69, rotationX: 14, rotation: -4, y: 20 }, { scale: 1, rotationX: 0, rotation: 0, y: 0, duration: 1, ease: "power1.inOut" }, 0)
            .fromTo(".hero-satellite-left", { xPercent: 35, rotation: -14 }, { xPercent: -70, rotation: -28, opacity: 0, duration: 0.85 }, 0)
            .fromTo(".hero-satellite-right", { xPercent: -35, rotation: 14 }, { xPercent: 70, rotation: 28, opacity: 0, duration: 0.85 }, 0)
            .to(".hero-stamp", { y: -90, rotation: 18, opacity: 0, duration: 0.65 }, 0)
            .to({}, { duration: 0.18 });
          // The narrative is laid out horizontally only while this context owns the pin.
          flow.dataset.rail = "active";
          const rail = flow.querySelector<HTMLElement>(".landing-flow-grid")!;
          const distance = () => Math.max(0, rail.scrollWidth - window.innerWidth);
          const journey = gsap.timeline({ scrollTrigger: {
            id: "landing-journey", trigger: ".flow-scene", start: "top 92px", end: () => "+=" + distance(),
            pin: true, scrub: true, invalidateOnRefresh: true,
          } });
          journey.to(rail, { x: () => -distance(), ease: "none", duration: 1 }, 0)
            .fromTo(".flow-progress>span", { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1 }, 0);
        } else {
          gsap.fromTo(".hero-product", { scale: 0.84, rotation: -3 }, { scale: 1, rotation: 0, ease: "none", scrollTrigger: { trigger: ".hero-product-scene", start: "top 90%", end: "bottom 48%", scrub: 0.55 } });
          gsap.utils.toArray<HTMLElement>(".landing-flow-item").forEach(card => {
            gsap.from(card, { y: 50, rotation: 2, opacity: 0.5, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: card, start: "top 92%", once: true } });
            gsap.fromTo(card.querySelector(".flow-screen"), { scale: 0.9 }, { scale: 1, ease: "none", scrollTrigger: { trigger: card, start: "top 85%", end: "bottom 85%", scrub: 0.4 } });
          });
        }
        gsap.to(".module-track", { x: () => -Math.max(0, root.querySelector<HTMLElement>(".module-track")!.scrollWidth - window.innerWidth + 30), ease: "none", scrollTrigger: { trigger: ".landing-module-strip", start: "top bottom", end: "bottom 10%", scrub: 0.6, invalidateOnRefresh: true } });
        gsap.fromTo(".landing-mission", { clipPath: "inset(0 5% round 60px)" }, { clipPath: "inset(0 0% round 0px)", ease: "none", scrollTrigger: { trigger: ".landing-mission", start: "top 95%", end: "top 12%", scrub: 0.65 } });
        gsap.fromTo(".mission-word", { opacity: 0.22 }, { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".landing-mission h2", start: "top 82%", end: "bottom 40%", scrub: 0.4 } });
        gsap.fromTo(".mission-symbol", { rotation: -18, y: 30 }, { rotation: 12, y: -15, ease: "none", scrollTrigger: { trigger: ".landing-mission", start: "top bottom", end: "bottom top", scrub: 0.5 } });
        gsap.utils.toArray<HTMLElement>("[data-motion-heading]").forEach(heading => {
          gsap.from(heading.querySelectorAll(".motion-word"), { yPercent: 112, rotation: 4, duration: 0.9, stagger: 0.08, ease: "power4.out", scrollTrigger: { trigger: heading, start: "top 92%", once: true } });
        });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach(element => {
          gsap.from(element, { y: 30, opacity: 0, duration: 0.75, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 94%", once: true } });
        });
        gsap.fromTo(".final-orbit", { rotation: -85, scale: 0.65 }, { rotation: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".landing-final", start: "top 90%", end: "top 20%", scrub: 0.5 } });
        gsap.from(".footer-wordmark .motion-char", { yPercent: 110, rotation: 8, stagger: 0.07, ease: "power3.out", scrollTrigger: { trigger: ".footer-wordmark", start: "top 97%", end: "bottom 98%", scrub: 0.6 } });
        if (desktop) {
          root.querySelectorAll<HTMLElement>("[data-magnetic]").forEach(button => {
            const xTo = gsap.quickTo(button, "x", { duration: 0.4, ease: "power3.out" });
            const yTo = gsap.quickTo(button, "y", { duration: 0.4, ease: "power3.out" });
            const move = (event: PointerEvent) => {
              const rect = button.getBoundingClientRect();
              xTo((event.clientX - rect.left - rect.width / 2) * 0.09);
              yTo((event.clientY - rect.top - rect.height / 2) * 0.15);
            };
            const leave = () => { xTo(0); yTo(0); };
            button.addEventListener("pointermove", move);
            button.addEventListener("pointerleave", leave);
            listeners.push(() => { button.removeEventListener("pointermove", move); button.removeEventListener("pointerleave", leave); });
          });
        }
        return () => { delete flow.dataset.rail; listeners.forEach(remove => remove()); };
      });
      details.forEach(detail => detail.addEventListener("toggle", refresh));
      // Images reserve their aspect ratio: decoding alone does not change layout.
      // Only actual document size changes need a refresh, after scrolling settles.
      observer.observe(root);
      void document.fonts.ready.then(() => { if (!disposed) refresh(); });
      refresh();
    }
    void setup().catch(() => { cleanup?.(); });
    return () => { disposed = true; cleanup?.(); };
  }, []);
  return null;
}

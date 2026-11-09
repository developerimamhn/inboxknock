import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";

/**
 * Scroll animation for the home page. Loaded lazily, only in "motion" mode.
 * Rules: animate transform and opacity only, never hide content that has no
 * animation to bring it back, never pin on small screens.
 * Returns a cleanup function.
 */
export function initMotion(): () => void {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const cleanups: Array<() => void> = [];
  const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches && navigator.maxTouchPoints === 0;

  /* Smooth scroll on desktop pointers only. Touch keeps native scrolling. */
  let lenis: Lenis | null = null;
  if (finePointer) {
    const navH = $("header")?.getBoundingClientRect().height ?? 64;
    lenis = new Lenis({ duration: 1.05, anchors: { offset: -(navH + 16) }, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis!.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    cleanups.push(() => {
      gsap.ticker.remove(raf);
      lenis?.destroy();
    });
  }

  const mm = gsap.matchMedia();
  cleanups.push(() => mm.revert());

  /* Headlines: masked line rise, once. Explains reading order, no loop. */
  const splits: SplitText[] = [];
  $$("[data-reveal]").forEach((el) => {
    const split = SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "reveal-line",
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      },
    });
    splits.push(split);
  });
  cleanups.push(() => splits.forEach((s) => s.revert()));

  /* Hero: as the visitor scrolls past, the door opens and they walk through it. */
  const doorWrap = $("[data-hero-door]");
  if (doorWrap) {
    const leaf = $<SVGGElement>(".leaf-scroll", doorWrap);
    const stage = $<SVGGElement>(".door-scroll", doorWrap);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: doorWrap,
        // Never earlier than the top of the page, so the door is shut on arrival.
        start: () => Math.max(0, doorWrap.getBoundingClientRect().top + scrollY - innerHeight * 0.35),
        end: "bottom top",
        scrub: 0.4,
        invalidateOnRefresh: true,
      },
    });
    if (leaf) tl.to(leaf, { scaleX: 0.06, transformOrigin: "0% 50%", ease: "none", duration: 1 }, 0);
    if (stage) tl.to(stage, { scale: 1.8, svgOrigin: "200 330", ease: "power1.in", duration: 1 }, 0);
    tl.to(doorWrap, { opacity: 0, ease: "power1.in", duration: 0.5 }, 0.4);
  }

  /* Problem: each bounce hits the domain shield and leaves a crack. */
  const problem = $("[data-problem]");
  if (problem) {
    const shield = $("[data-shield]", problem);
    const cracks = $$<SVGPathElement>("[data-crack]", problem);
    const bounces = $$<SVGGElement>("[data-bounce]", problem);
    const tl = gsap.timeline({
      scrollTrigger: { trigger: $("svg", problem) ?? problem, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
    });
    bounces.forEach((b, i) => {
      const ix = Number(b.dataset.ix);
      const iy = Number(b.dataset.iy);
      const at = i * 1.1;
      tl.fromTo(b, { x: ix + 320, y: iy, opacity: 0 }, { x: ix, y: iy, opacity: 1, duration: 0.6, ease: "power2.in" }, at)
        .fromTo(cracks[i], { opacity: 0 }, { opacity: 1, duration: 0.08 }, at + 0.6)
        .fromTo(shield, { x: 0 }, { x: -6, duration: 0.06, yoyo: true, repeat: 1, ease: "power1.inOut" }, at + 0.6)
        .to(b, { x: 0, y: 0, duration: 0.6, ease: "power2.out" }, at + 0.66);
    });
  }

  /* How it works: pinned on wide screens, scroll moves through the three steps. */
  mm.add("(min-width: 1024px) and (min-height: 640px)", () => {
    const section = $("[data-how]");
    const stage = $("[data-how-stage]");
    const track = $(".how-track");
    const bar = $("[data-how-bar]");
    if (!section || !stage || !track) return;
    section.classList.add("how-pinned");
    const panels = $$("[data-how-panel]", track);
    const distance = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const setActive = (p: number) => {
      const idx = Math.min(panels.length - 1, Math.round(p * (panels.length - 1)));
      panels.forEach((el, i) => el.classList.toggle("is-active", i === idx));
    };
    setActive(0);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: stage,
        start: "center 55%",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (bar) gsap.set(bar, { scaleX: self.progress });
          setActive(self.progress);
        },
      },
    });
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(track, { clearProps: "transform" });
      section.classList.remove("how-pinned");
      panels.forEach((el) => el.classList.remove("is-active"));
    };
  });

  /* What we check: each row lights up as one knock when it reaches the reader. */
  const checks = $("[data-checks]");
  if (checks) {
    checks.classList.add("js-checks");
    $$("[data-check-row]", checks).forEach((row) => {
      ScrollTrigger.create({ trigger: row, start: "top 72%", once: true, onEnter: () => row.classList.add("is-lit") });
    });
    cleanups.push(() => {
      checks.classList.remove("js-checks");
      $$("[data-check-row]", checks).forEach((row) => row.classList.add("is-lit"));
    });
  }

  /* Free: count up once to the real configured limit. */
  const counter = $("[data-count]");
  if (counter) {
    const target = Number(counter.dataset.count);
    const fmt = new Intl.NumberFormat(counter.dataset.countLocale || "en-US");
    const finalText = counter.textContent;
    const state = { v: 0 };
    counter.textContent = fmt.format(0);
    ScrollTrigger.create({
      trigger: counter,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(state, {
          v: target,
          duration: 1.8,
          ease: "power3.out",
          onUpdate: () => {
            counter.textContent = fmt.format(Math.round(state.v));
          },
          onComplete: () => {
            counter.textContent = finalText;
          },
        }),
    });
    cleanups.push(() => {
      counter.textContent = finalText;
    });
  }

  /* Magnetic buttons: a small pull toward the pointer. Desktop only. */
  if (finePointer) {
    $$("[data-magnetic]").forEach((el) => {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        el.style.translate = `${(dx * 6).toFixed(1)}px ${(dy * 5).toFixed(1)}px`;
      };
      const leave = () => {
        el.style.translate = "";
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
        el.style.translate = "";
      });
    });
  }

  /* Recalculate once web fonts change line breaks. */
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return () => {
    cleanups.reverse().forEach((fn) => fn());
    ScrollTrigger.getAll().forEach((t) => t.kill());
  };
}

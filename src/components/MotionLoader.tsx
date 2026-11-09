"use client";

import { useEffect } from "react";

/**
 * Loads the scroll animation bundle after the page is idle.
 * Also wires two small helpers that work in every comfort mode:
 *  - links marked data-focus-check move focus into the checker
 *  - magnetic buttons on desktop pointers (motion mode only)
 */
export function MotionLoader() {
  useEffect(() => {
    const root = document.documentElement;

    // Links to the checker: scroll there and put the cursor in the field.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-focus-check]");
      if (!link) return;
      const hash = link.hash;
      if (!hash || link.pathname !== location.pathname) return;
      if (hash === "#check-csv") window.dispatchEvent(new Event("ik:open-csv"));
      const field = document.querySelector<HTMLInputElement>("#check input[type=email]");
      window.setTimeout(() => {
        const target = document.querySelector<HTMLInputElement | HTMLLabelElement>(
          hash === "#check-csv" ? "#check input[type=file], #check input[type=email]" : "#check input[type=email]",
        );
        (target ?? field)?.focus({ preventScroll: true });
      }, 50);
    };
    document.addEventListener("click", onClick);

    let cleanup: (() => void) | undefined;
    let cancelled = false;
    const start = async () => {
      if (!root.classList.contains("motion")) return;
      // Low battery and not charging counts as low power: switch to calm mode.
      try {
        const nav = navigator as Navigator & { getBattery?: () => Promise<{ charging: boolean; level: number }> };
        const battery = await nav.getBattery?.();
        if (battery && !battery.charging && battery.level <= 0.2) {
          root.classList.replace("motion", "calm");
          return;
        }
      } catch {
        /* not supported */
      }
      if (cancelled) return;
      import("@/motion/init")
        .then((m) => {
          if (!cancelled) cleanup = m.initMotion();
        })
        .catch(() => {
          /* Animation is optional. The page is complete without it. */
        });
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const handle = idle ? idle(start, { timeout: 2000 }) : window.setTimeout(start, 600);

    return () => {
      cancelled = true;
      document.removeEventListener("click", onClick);
      if (!idle) window.clearTimeout(handle as number);
      cleanup?.();
    };
  }, []);

  return null;
}

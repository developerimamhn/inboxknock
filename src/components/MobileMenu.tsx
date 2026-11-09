"use client";

import { useEffect, useRef } from "react";
import { getCopy, type Lang } from "@/config/site";

/** A disclosure built on <details>, so it opens without JavaScript too. */
export function MobileMenu({ lang, links, ctaHref }: { lang: Lang; links: { href: string; text: string }[]; ctaHref: string }) {
  const t = getCopy(lang);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && el.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (el.open && !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details ref={ref} className="group lg:hidden">
      <summary className="inline-flex min-h-11 min-w-11 list-none items-center justify-center rounded-full shadow-[inset_0_0_0_1px_var(--color-edge)] [&::-webkit-details-marker]:hidden">
        <span className="sr-only">{t.a11y.menu}</span>
        <span aria-hidden="true" className="relative block h-3 w-4">
          <span className="absolute inset-x-0 top-0 h-[1.5px] bg-paper transition-transform duration-300 group-open:translate-y-[5px] group-open:rotate-45" />
          <span className="absolute inset-x-0 bottom-0 h-[1.5px] bg-paper transition-transform duration-300 group-open:-translate-y-[5.5px] group-open:-rotate-45" />
        </span>
      </summary>
      <div className="absolute inset-x-0 top-[var(--nav-h)] border-b border-rule bg-ink">
        <ul className="wrap flex flex-col py-4">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={close} className="flex min-h-14 items-center border-b border-rule text-[1.5rem] font-semibold tracking-[-0.02em] no-underline">
                {l.text}
              </a>
            </li>
          ))}
          <li className="pt-5 md:hidden">
            <a href={ctaHref} onClick={close} className="btn w-full" data-focus-check>
              {t.nav.cta}
            </a>
          </li>
        </ul>
      </div>
    </details>
  );
}

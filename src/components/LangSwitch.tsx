"use client";

import { getCopy, localePath, type Lang } from "@/config/site";
import { rememberLang } from "@/lib/lang-pref";

/** Plain links, so it works without JavaScript. The click also remembers the choice. */
export function LangSwitch({ lang, path }: { lang: Lang; path: string }) {
  const t = getCopy(lang);
  const item = (code: Lang, text: string) => {
    const active = code === lang;
    return (
      <a
        href={localePath(code, path)}
        hrefLang={code}
        lang={code}
        aria-current={active ? "true" : undefined}
        onClick={() => rememberLang(code)}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-[0.9375rem] no-underline transition-colors ${
          active ? "bg-paper font-semibold text-ink" : "text-muted hover:text-paper"
        } ${code === "bn" ? "font-bn" : ""}`}
      >
        {text}
      </a>
    );
  };
  return (
    <nav aria-label={t.a11y.langSwitch} className="flex items-center rounded-full p-0.5 shadow-[inset_0_0_0_1px_var(--color-rule)]">
      {item("en", t.nav.langLabelEn)}
      {item("bn", t.nav.langLabelBn)}
    </nav>
  );
}

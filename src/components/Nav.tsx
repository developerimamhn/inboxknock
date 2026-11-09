import { getCopy, localePath, type Lang } from "@/config/site";
import { LangSwitch } from "./LangSwitch";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

export function Nav({ lang, path = "/", home = true }: { lang: Lang; path?: string; home?: boolean }) {
  const t = getCopy(lang);
  const base = home ? "" : localePath(lang, "/");
  const links = [
    { href: `${base}#how`, text: t.nav.how },
    { href: `${base}#results`, text: t.nav.results },
    { href: `${base}#faq`, text: t.nav.faq },
  ];
  const ctaHref = `${base}#check`;
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-rule bg-ink">
      <div className="wrap flex h-[var(--nav-h)] items-center justify-between gap-3">
        <a href={home ? "#top" : localePath(lang, "/")} className="-ml-1 inline-flex min-h-11 items-center rounded px-1 no-underline" aria-label="InboxKnock">
          <Logo />
        </a>
        <nav aria-label={t.a11y.primaryNav} className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="inline-flex min-h-11 items-center rounded-full px-4 text-[0.9375rem] text-muted no-underline transition-colors hover:text-paper">
                  {l.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitch lang={lang} path={path} />
          <a href={ctaHref} className="btn hidden min-h-11 px-5 text-[0.9375rem] md:inline-flex" data-magnetic data-focus-check>
            {t.nav.cta}
          </a>
          <MobileMenu lang={lang} links={links} ctaHref={ctaHref} />
        </div>
      </div>
    </header>
  );
}

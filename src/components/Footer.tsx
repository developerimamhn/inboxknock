import { CONTACT_EMAIL, getCopy, localePath, type Lang } from "@/config/site";
import { Logo } from "./Logo";

export function Footer({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  return (
    <footer className="border-t border-rule pb-28 pt-16 md:pb-12">
      <div className="wrap">
        <p className="display-3 max-w-[18ch] text-paper">{t.footer.line}</p>
        <div className="mt-14 flex flex-col gap-6 border-t border-rule pt-8 md:flex-row md:items-center md:justify-between">
          <a href={localePath(lang, "/")} className="inline-flex min-h-11 items-center self-start no-underline" aria-label="InboxKnock">
            <Logo />
          </a>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[0.9375rem] text-muted">
            <li>
              <a className="link" href={localePath(lang, "/terms")}>
                {t.footer.terms}
              </a>
            </li>
            <li>
              <a className="link" href={localePath(lang, "/privacy")}>
                {t.footer.privacy}
              </a>
            </li>
            <li>
              <a className="link" href={`mailto:${CONTACT_EMAIL}`}>
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <a className="link" href="#top">
                {t.a11y.backToTop}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

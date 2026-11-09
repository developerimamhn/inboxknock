import { FREE_MONTHLY_CHECKS, fill, formatNumber, getCopy, type Lang } from "@/config/site";
import type { CheckerMode } from "@/lib/verify";
import { SectionLabel } from "./SectionLabel";

/** Where "Clean your first list" leads: the CSV tool, or the early access form. */
function listHref(mode: CheckerMode) {
  return mode === "early" ? "#check" : "#check-csv";
}

export function Who({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  return (
    <section id="who" aria-labelledby="who-title" className="section">
      <div className="wrap grid-12 gap-y-10">
        <div className="col-span-4 md:col-span-12">
          <SectionLabel num="05" text={t.who.label} />
        </div>
        <h2 id="who-title" className="display-2 col-span-4 max-w-[15ch] md:col-span-11" data-reveal>
          {t.who.h2}
        </h2>
        <p className="lead col-span-4 max-w-[36ch] md:col-span-7 md:col-start-6 lg:col-span-5 lg:col-start-8">{t.who.text}</p>
      </div>
    </section>
  );
}

export function Free({ lang, mode }: { lang: Lang; mode: CheckerMode }) {
  const t = getCopy(lang);
  return (
    <section id="free" aria-labelledby="free-title" className="section">
      <div className="wrap grid-12 items-end gap-y-10">
        <div className="col-span-4 md:col-span-12 lg:col-span-5">
          <SectionLabel num="06" text={t.free.label} />
          <h2 id="free-title" className="display-2 mt-6" data-reveal>
            {t.free.h2}
          </h2>
          <p className="lead mt-8 max-w-[30ch]">{fill(t.free.text, lang)}</p>
          <a href={listHref(mode)} className="btn btn-lg mt-10" data-magnetic data-focus-check>
            {t.free.button}
            <span className="btn-arrow" aria-hidden="true">
              {"→"}
            </span>
          </a>
        </div>
        <div className="col-span-4 md:col-span-12 lg:col-span-7 lg:text-right">
          <p aria-hidden="true">
            <span
              className="block text-[clamp(4.5rem,19vw,17rem)] font-bold leading-[0.85] tracking-[-0.05em] tabular-nums"
              data-count={FREE_MONTHLY_CHECKS}
              data-count-locale={lang === "bn" ? "bn-BD" : "en-US"}
            >
              {formatNumber(FREE_MONTHLY_CHECKS, lang)}
            </span>
            <span className="mt-4 block text-[1.25rem] text-muted">{t.free.unit}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

export function Faq({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  return (
    <section id="faq" aria-labelledby="faq-title" className="section">
      <div className="wrap grid-12 gap-y-10">
        <div className="col-span-4 md:col-span-12 lg:col-span-4">
          <SectionLabel num="07" text={t.faq.label} />
          <h2 id="faq-title" className="display-3 mt-6 max-w-[12ch]" data-reveal>
            {t.faq.h2}
          </h2>
        </div>
        <div className="faq col-span-4 md:col-span-12 lg:col-span-8">
          {t.faq.items.map((item, i) => (
            <details key={i} className="border-t border-rule last:border-b">
              <summary className="flex min-h-16 items-center justify-between gap-6 py-6 text-[clamp(1.25rem,2.2vw,1.875rem)] font-semibold leading-tight tracking-[-0.02em]">
                <span>{item.q}</span>
                <span className="faq-icon relative block h-5 w-5 flex-none" aria-hidden="true">
                  <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-paper" />
                  <span className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-paper" />
                </span>
              </summary>
              <p className="faq-answer max-w-[52ch] pb-8 text-[1.125rem] text-muted sm:text-[1.25rem]">{fill(item.a, lang)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCall({ lang, mode }: { lang: Lang; mode: CheckerMode }) {
  const t = getCopy(lang);
  return (
    <section id="start" aria-labelledby="final-title" className="section pb-[clamp(6rem,14vh,10rem)]">
      <div className="wrap">
        <h2 id="final-title" className="display-1 max-w-[14ch] !text-[clamp(3rem,9.5vw,10rem)]" data-reveal>
          {t.final.h2}
        </h2>
        <a href={listHref(mode)} className="btn btn-lg mt-12" data-magnetic data-focus-check>
          {t.final.button}
          <span className="btn-arrow" aria-hidden="true">
            {"→"}
          </span>
        </a>
      </div>
    </section>
  );
}

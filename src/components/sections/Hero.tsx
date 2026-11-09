import { getCopy, type Lang } from "@/config/site";
import type { CheckerMode } from "@/lib/verify";
import { HeroChecker } from "../checker/HeroChecker";

export function Hero({ lang, mode }: { lang: Lang; mode: CheckerMode }) {
  const t = getCopy(lang);
  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-x-clip pb-16 pt-[calc(var(--nav-h)+2.5rem)] sm:pt-[calc(var(--nav-h)+4rem)] lg:min-h-[100svh] lg:pb-24" data-hero>
      <span id="check-csv" className="sr-only" />
      <div
        className="wrap grid items-start gap-x-10 gap-y-8 [grid-template-areas:'title'_'form'_'door'] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-y-12 lg:[grid-template-areas:'title_door'_'form_door']"
      >
        <div className="[grid-area:title]" data-hero-copy>
          <p className="label mb-6">
            <span className="inline-block h-2 w-2 rounded-full bg-paper" aria-hidden="true" />
            {t.hero.label}
          </p>
          <h1 id="hero-title" className="display-1 max-w-[11ch]">
            {t.hero.h1.map((line, i) => (
              <span key={i} className="mask-line hero-line">
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <p className="lead mt-6 max-w-[34ch] sm:mt-8">{t.hero.sub}</p>
        </div>
        <HeroChecker lang={lang} mode={mode} />
      </div>
    </section>
  );
}

import { getCopy, type Lang } from "@/config/site";
import { SectionLabel } from "./SectionLabel";

export function Checks({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  return (
    <section id="checks" aria-labelledby="checks-title" className="section" data-checks>
      <div className="wrap grid-12 gap-y-12">
        <div className="col-span-4 md:col-span-12 lg:col-span-5">
          <div className="lg:sticky lg:top-[calc(var(--nav-h)+3rem)]">
            <SectionLabel num="03" text={t.checks.label} />
            <h2 id="checks-title" className="display-2 mt-6 max-w-[10ch]" data-reveal>
              {t.checks.h2}
            </h2>
          </div>
        </div>
        <ol className="col-span-4 md:col-span-12 lg:col-span-7">
          {t.checks.items.map((item, i) => (
            <li key={item.title} className="check-row grid grid-cols-[auto_1fr] gap-x-5 border-t border-rule py-8 last:border-b sm:gap-x-8 sm:py-10" data-check-row>
              <span className="mt-3 flex items-center gap-4 sm:mt-4">
                <span className="w-7 text-[0.9375rem] tabular-nums text-muted" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="check-mark" aria-hidden="true" />
              </span>
              <div>
                <h3 className="check-title text-[clamp(1.75rem,3.4vw,3rem)] font-semibold leading-[1.1] tracking-[-0.025em]">{item.title}</h3>
                <p className="mt-3 max-w-[36ch] text-[1.125rem] text-muted sm:text-[1.25rem]">{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

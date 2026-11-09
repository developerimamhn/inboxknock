import { getCopy, type Lang } from "@/config/site";
import { SectionLabel } from "./SectionLabel";

/** Where each bounced envelope ends up, and where it hits the shield on the way. */
const ENVELOPES = [
  { x: 506, y: 74, r: -18, hitX: 368, hitY: 150 },
  { x: 572, y: 168, r: 12, hitX: 370, hitY: 214 },
  { x: 492, y: 238, r: -8, hitX: 362, hitY: 284 },
  { x: 572, y: 318, r: 20, hitX: 340, hitY: 340 },
  { x: 470, y: 392, r: -24, hitX: 300, hitY: 386 },
];

const CRACKS = [
  "M368 150l-28 10-14-12-26 18-10-6",
  "M370 214l-26 8-12 18-26-4",
  "M362 284l-24-7-16 18-26-6-8 10",
  "M340 340l-20-14-22 10-14-18",
  "M300 386l-8-24-22 6-8-22",
];

export function Problem({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  return (
    <section id="problem" aria-labelledby="problem-title" className="section" data-problem>
      <div className="wrap grid-12 items-center gap-y-12">
        <div className="col-span-4 md:col-span-12 lg:col-span-6">
          <SectionLabel num="01" text={t.problem.label} />
          <h2 id="problem-title" className="display-2 mt-6" data-reveal>
            {t.problem.h2}
          </h2>
          <p className="lead mt-8 max-w-[38ch]">{t.problem.text}</p>
        </div>
        <div className="col-span-4 md:col-span-10 md:col-start-2 lg:col-span-6 lg:col-start-7">
          <svg viewBox="0 0 640 480" className="block h-auto w-full overflow-visible" aria-hidden="true" focusable="false">
            <g data-shield>
              <path
                d="M250 70l120 42v118c0 90-56 154-120 180-64-26-120-90-120-180V112Z"
                fill="var(--color-ink-2)"
                stroke="var(--color-paper)"
                strokeWidth="2"
              />
              <path d="M250 98l94 33v99c0 72-44 124-94 146-50-22-94-74-94-146v-99Z" fill="none" stroke="var(--color-rule)" strokeWidth="1.5" />
              <text x="250" y="244" textAnchor="middle" fontSize="20" fontWeight="600" fill="var(--color-paper)" style={{ fontFamily: "inherit" }}>
                {t.problem.shield}
              </text>
              <g fill="none" stroke="var(--color-paper)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {CRACKS.map((d, i) => (
                  <path key={i} d={d} data-crack />
                ))}
              </g>
            </g>
            {ENVELOPES.map((e, i) => (
              <g key={i} transform={`translate(${e.x} ${e.y})`}>
                <g data-bounce data-ix={e.hitX - e.x} data-iy={e.hitY - e.y - 15}>
                  <g transform={`rotate(${e.r} 22 15)`}>
                    <rect width="44" height="30" rx="2.5" fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth="1.75" />
                    <path d="M2 3l20 14 20-14" fill="none" stroke="var(--color-paper)" strokeWidth="1.75" />
                  </g>
                </g>
              </g>
            ))}
            <g transform="translate(470 290)">
              <path d="M10 0c-14 8-14 22 0 30" fill="none" stroke="var(--color-dim)" strokeWidth="1.5" strokeDasharray="3 4" />
              <text x="20" y="20" fontSize="16" fill="var(--color-muted)" style={{ fontFamily: "inherit" }}>
                {t.problem.bounced}
              </text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

import { getCopy, type Lang } from "@/config/site";
import { SectionLabel } from "./SectionLabel";

const stroke = { fill: "none", stroke: "var(--color-paper)", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function UploadArt() {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full" aria-hidden="true" focusable="false">
      <rect x="92" y="18" width="136" height="150" rx="6" {...stroke} />
      {[48, 72, 96, 120, 144].map((y, i) => (
        <g key={y}>
          <path d={`M110 ${y}h22`} {...stroke} stroke="var(--color-dim)" />
          <path d={`M142 ${y}h${i === 1 ? 64 : 52}`} {...stroke} stroke={i === 1 ? "var(--color-paper)" : "var(--color-dim)"} />
        </g>
      ))}
      <path d="M160 196v-16m-10 8 10-10 10 10" {...stroke} />
    </svg>
  );
}

function KnockArt() {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full" aria-hidden="true" focusable="false">
      <path d="M150 190V70a50 50 0 0 1 100 0v120" {...stroke} />
      <path d="M158 190V72a42 42 0 0 1 84 0v118Z" fill="var(--color-ink)" stroke="var(--color-paper)" strokeWidth="2" />
      <circle cx="230" cy="136" r="3.5" fill="var(--color-paper)" />
      <rect x="70" y="112" width="58" height="38" rx="3" {...stroke} />
      <path d="M72 115l29 20 29-20" {...stroke} />
      <path d="M138 118c6 6 6 14 0 20M146 112c10 10 10 24 0 34" {...stroke} stroke="var(--color-muted)" />
      <path d="M40 190h240" {...stroke} />
    </svg>
  );
}

function SendArt() {
  return (
    <svg viewBox="0 0 320 200" className="h-auto w-full" aria-hidden="true" focusable="false">
      {[40, 76, 112, 148].map((y, i) => (
        <g key={y} opacity={i === 2 ? 0.45 : 1}>
          {i === 2 ? (
            <path d={`M44 ${y - 6}l12 12m0-12-12 12`} {...stroke} />
          ) : (
            <path d={`M43 ${y}l6 6 12-12`} {...stroke} stroke="var(--color-signal)" />
          )}
          <path d={`M76 ${y}h${i === 2 ? 70 : 90}`} {...stroke} stroke={i === 2 ? "var(--color-dim)" : "var(--color-paper)"} strokeDasharray={i === 2 ? "4 6" : undefined} />
        </g>
      ))}
      <g transform="translate(210 70) rotate(-14)">
        <rect width="64" height="42" rx="3" {...stroke} />
        <path d="M2 3l30 22 30-22" {...stroke} />
      </g>
      <path d="M186 118h-24M192 132h-40M188 146h-18" {...stroke} stroke="var(--color-dim)" />
    </svg>
  );
}

const ART = [UploadArt, KnockArt, SendArt];

export function HowItWorks({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  return (
    <section id="how" aria-labelledby="how-title" className="section overflow-x-clip" data-how>
      <div className="wrap">
        <SectionLabel num="02" text={t.how.label} />
        <h2 id="how-title" className="display-2 mt-6 max-w-[14ch]" data-reveal>
          {t.how.h2}
        </h2>
        <div data-how-stage className="pt-12">
        <div className="how-progress mb-8 hidden h-px w-full bg-rule" aria-hidden="true">
          <div className="h-px origin-left scale-x-0 bg-paper" data-how-bar />
        </div>
        <ol className="how-track grid gap-4 md:grid-cols-3 md:gap-6">
          {t.how.steps.map((step, i) => {
            const Art = ART[i];
            return (
              <li key={step.title} className="how-panel flex flex-col rounded-[2rem] border border-rule bg-ink-2 p-6 sm:p-8" data-how-panel>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[0.9375rem] font-medium tabular-nums text-muted" aria-hidden="true">
                    0{i + 1} / 03
                  </span>
                </div>
                <div className="my-8 w-full max-w-[22rem] self-center md:my-10">
                  <Art />
                </div>
                <h3 className="display-3 mt-auto">
                  <span className="sr-only">{i + 1}. </span>
                  {step.title}
                </h3>
                <p className="lead mt-4 max-w-[30ch]">{step.text}</p>
              </li>
            );
          })}
        </ol>
        </div>
      </div>
    </section>
  );
}

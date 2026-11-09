"use client";

import { useState } from "react";
import { STATUSES, getCopy, type Lang, type Status } from "@/config/site";
import { DoorSvg } from "../DoorSvg";
import { StatusTag } from "../StatusTag";
import { SectionLabel } from "./SectionLabel";

/** Tap or hover a status and the door shows that response. Explains the four answers. */
export function Results({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  const [active, setActive] = useState<Status>("valid");
  const [answerId, setAnswerId] = useState(0);
  const item = t.results.items[active];

  const pick = (s: Status) => {
    if (s === active) return;
    setActive(s);
    setAnswerId((n) => n + 1);
  };

  return (
    <section id="results" aria-labelledby="results-title" className="section">
      <div className="wrap">
        <SectionLabel num="04" text={t.results.label} />
        <h2 id="results-title" className="display-2 mt-6 max-w-[16ch]" data-reveal>
          {t.results.h2}
        </h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
          <div className="order-2 lg:order-1">
            <p id="results-pick" className="mb-4 text-muted">
              {t.results.pick}
            </p>
            <ul aria-labelledby="results-pick" className="border-b border-rule">
              {STATUSES.map((s) => {
                const it = t.results.items[s];
                return (
                  <li key={s}>
                    <button
                      type="button"
                      className="status-btn grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-2 py-5 sm:grid-cols-[9rem_1fr_auto] sm:px-4"
                      aria-pressed={active === s}
                      onClick={() => pick(s)}
                      onMouseEnter={() => pick(s)}
                      onFocus={() => pick(s)}
                    >
                      <StatusTag status={s} lang={lang} />
                      <span className="col-span-2 text-[1.0625rem] text-paper sm:col-span-1 sm:col-start-2 sm:row-start-1">
                        {it.meaning} <span className="font-semibold">{it.action}</span>
                      </span>
                      <span className="status-arrow col-start-2 row-start-1 text-[1.25rem] sm:col-start-3" aria-hidden="true">
                        {"→"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="order-1 lg:order-2">
            <div className="mx-auto w-full max-w-[15rem] sm:max-w-[19rem] lg:max-w-[24rem]">
              <DoorSvg state={active} label={item.name} answerId={answerId} />
            </div>
            <p aria-live="polite" className="mt-6 text-center text-[1.125rem] text-paper">
              <span className="font-semibold">{item.name}.</span> {item.meaning} {item.action}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

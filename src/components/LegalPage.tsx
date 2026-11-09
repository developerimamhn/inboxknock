import { LEGAL, getCopy, localePath, type Lang } from "@/config/site";
import { Nav } from "./Nav";
import { Footer } from "./Footer";

export function LegalPage({ lang, page }: { lang: Lang; page: "terms" | "privacy" }) {
  const t = getCopy(lang);
  const doc = LEGAL[lang][page];
  const path = `/${page}`;
  return (
    <>
      <Nav lang={lang} path={path} home={false} />
      <main id="top" className="pb-24 pt-[calc(var(--nav-h)+4rem)]">
        <article className="wrap max-w-[52rem]">
          <a href={localePath(lang, "/")} className="link text-[0.9375rem] text-muted">
            {"←"} {t.legal.back}
          </a>
          <h1 className="display-3 mt-8">{doc.title}</h1>
          <p className="lead mt-6">{doc.intro}</p>
          <p className="mt-6 text-[0.9375rem] text-muted">
            {t.legal.updated}: <span className="todo mt-2 inline-block">{doc.updated}</span>
          </p>
          <div className="mt-12 space-y-12">
            {doc.sections.map((s) => (
              <section key={s.heading} aria-labelledby={`${page}-${s.heading}`}>
                <h2 id={`${page}-${s.heading}`} className="text-[1.5rem] font-semibold tracking-[-0.02em] sm:text-[1.75rem]">
                  {s.heading}
                </h2>
                <div className="mt-4 space-y-4 text-[1.0625rem] text-muted sm:text-[1.125rem]">
                  {s.blocks.map((b, i) =>
                    b.type === "p" ? (
                      <p key={i}>{b.text}</p>
                    ) : b.type === "list" ? (
                      <ul key={i} className="list-disc space-y-2 pl-6 marker:text-dim">
                        {b.items.map((it) => (
                          <li key={it}>{it}</li>
                        ))}
                      </ul>
                    ) : (
                      <p key={i} className="todo">
                        <strong>{t.legal.todo}:</strong> {b.text}
                      </p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer lang={lang} />
    </>
  );
}

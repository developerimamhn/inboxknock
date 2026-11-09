import type { Metadata } from "next";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL, VERIFY_API_URL, getCopy, isLang, localePath, type Lang } from "@/config/site";
import { pageMetadata } from "@/lib/seo";
import type { CheckerMode } from "@/lib/verify";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { MobileCta } from "@/components/MobileCta";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Checks } from "@/components/sections/Checks";
import { Results } from "@/components/sections/Results";
import { Faq, FinalCall, Free, Who } from "@/components/sections/Closing";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  return pageMetadata(isLang(lang) ? lang : "en", "/");
}

/** Live checker when a backend is configured, demo in local development, early access otherwise. */
function checkerMode(): CheckerMode {
  if (VERIFY_API_URL) return "live";
  if (process.env.NODE_ENV === "development") return "demo";
  return "early";
}

function JsonLd({ lang }: { lang: Lang }) {
  const t = getCopy(lang);
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: `${SITE_URL}${localePath(lang, "/")}`,
    description: t.meta.description,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    inLanguage: lang,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    email: CONTACT_EMAIL,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : "en";
  const mode = checkerMode();
  const t = getCopy(lang);
  return (
    <>
      <JsonLd lang={lang} />
      <Nav lang={lang} path="/" />
      <main>
        <Hero lang={lang} mode={mode} />
        <Problem lang={lang} />
        <HowItWorks lang={lang} />
        <Checks lang={lang} />
        <Results lang={lang} />
        <Who lang={lang} />
        <Free lang={lang} mode={mode} />
        <Faq lang={lang} />
        <FinalCall lang={lang} mode={mode} />
      </main>
      <Footer lang={lang} />
      <MobileCta text={t.mobileCta} />
    </>
  );
}

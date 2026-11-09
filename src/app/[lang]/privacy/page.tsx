import type { Metadata } from "next";
import { LEGAL, isLang } from "@/config/site";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/LegalPage";

export async function generateMetadata({ params }: PageProps<"/[lang]/privacy">): Promise<Metadata> {
  const { lang: raw } = await params;
  const lang = isLang(raw) ? raw : "en";
  const doc = LEGAL[lang].privacy;
  return pageMetadata(lang, "/privacy", { title: doc.title, description: doc.intro });
}

export default async function Page({ params }: PageProps<"/[lang]/privacy">) {
  const { lang: raw } = await params;
  return <LegalPage lang={isLang(raw) ? raw : "en"} page="privacy" />;
}

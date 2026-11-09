import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, getCopy, localePath, type Lang } from "@/config/site";

export function pageMetadata(lang: Lang, path: string, opts?: { title?: string; description?: string }): Metadata {
  const copy = getCopy(lang);
  const title = opts?.title ? `${opts.title} | ${SITE_NAME}` : copy.meta.title;
  const description = opts?.description ?? copy.meta.description;
  const canonical = localePath(lang, path);
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    applicationName: SITE_NAME,
    alternates: {
      canonical,
      languages: {
        en: localePath("en", path),
        bn: localePath("bn", path),
        "x-default": localePath("en", path),
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: copy.meta.locale,
      alternateLocale: lang === "en" ? ["bn_BD"] : ["en_US"],
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: copy.meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false, address: false, email: false },
  };
}

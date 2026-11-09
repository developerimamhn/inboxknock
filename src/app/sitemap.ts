import type { MetadataRoute } from "next";
import { SITE_URL, localePath } from "@/config/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/terms", "/privacy"];
  return paths.map((path) => ({
    url: `${SITE_URL}${localePath("en", path)}`,
    changeFrequency: path === "/" ? "weekly" : "yearly",
    priority: path === "/" ? 1 : 0.3,
    alternates: {
      languages: {
        en: `${SITE_URL}${localePath("en", path)}`,
        bn: `${SITE_URL}${localePath("bn", path)}`,
      },
    },
  }));
}

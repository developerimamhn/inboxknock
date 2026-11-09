import type { Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { LOCALES, getCopy, isLang } from "@/config/site";
import { BANGLA_FONT_URL, display } from "@/lib/fonts";
import { MOTION_FLAG_SCRIPT } from "@/lib/motion-flag";
import { MotionLoader } from "@/components/MotionLoader";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  themeColor: "#0c0d0b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getCopy(lang);
  return (
    <html lang={lang} className={display.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_FLAG_SCRIPT }} />
        {lang === "bn" && <link rel="preload" href={BANGLA_FONT_URL} as="font" type="font/woff2" crossOrigin="anonymous" />}
      </head>
      <body>
        <a
          href="#check"
          className="sr-only z-[100] rounded-full bg-paper px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t.a11y.skip}
        </a>
        {children}
        <MotionLoader />
      </body>
    </html>
  );
}

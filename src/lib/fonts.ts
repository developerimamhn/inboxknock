import { Bricolage_Grotesque } from "next/font/google";

export const display = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--font-display",
});

/**
 * Anek Bangla (SIL Open Font License) is self-hosted from /public/fonts so it can be
 * preloaded on Bangla pages only. The @font-face rule is in globals.css.
 */
export const BANGLA_FONT_URL = "/fonts/anek-bangla-bengali.woff2";

import type { Metadata } from "next";
import "./globals.css";
import { display } from "@/lib/fonts";
import Link from "next/link";
import { SITE_URL, getCopy } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Nobody answered. | InboxKnock",
  description: "This page does not exist.",
  robots: { index: false },
};

export default function GlobalNotFound() {
  const t = getCopy("en");
  return (
    <html lang="en" className={display.variable}>
      <body>
        <main className="wrap flex min-h-svh flex-col justify-center py-24">
          <p className="label">[ 404 ]</p>
          <h1 className="display-2 mt-6">{t.notFound.title}</h1>
          <p className="lead mt-6">{t.notFound.text}</p>
          <Link href="/" className="btn btn-lg mt-10 self-start">
            {t.notFound.home}
          </Link>
        </main>
      </body>
    </html>
  );
}

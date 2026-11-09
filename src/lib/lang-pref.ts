import { LANG_COOKIE, type Lang } from "@/config/site";

/** Remember the visitor's language for a year. The proxy reads the cookie. */
export function rememberLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(LANG_COOKIE, lang);
  } catch {
    /* storage blocked */
  }
}

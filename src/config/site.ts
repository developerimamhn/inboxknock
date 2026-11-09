/**
 * InboxKnock site config.
 * Every setting and every line of visible copy lives here.
 * Use {n} for the free check limit and {email} for the contact email.
 */

export const FREE_MONTHLY_CHECKS = 10000;
export const CONTACT_EMAIL = "hello@inboxknock.com";
/** Server only. Never read this in a client component. */
export const VERIFY_API_URL = process.env.VERIFY_API_URL;

export const SITE_NAME = "InboxKnock";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://inboxknock.com").replace(/\/$/, "");

/** Largest CSV a visitor can upload, in bytes. */
export const CSV_MAX_BYTES = 5 * 1024 * 1024;
/** How many checks run at the same time during a CSV run. */
export const CSV_CONCURRENCY = 4;
/** Warn when remaining checks fall to this share of the limit or lower. */
export const LOW_CHECKS_WARNING_RATIO = 0.1;
/** Upstream timeout for one check, in ms. */
export const VERIFY_TIMEOUT_MS = 20000;

export const LOCALES = ["en", "bn"] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "ik_lang";

export type Status = "valid" | "invalid" | "risky" | "unknown";
export const STATUSES: Status[] = ["valid", "invalid", "risky", "unknown"];

/** Path helper. English lives at "/", Bangla at "/bn". */
export function localePath(lang: Lang, path = "/") {
  const clean = path === "/" ? "" : path;
  return lang === "bn" ? `/bn${clean}` : clean || "/";
}

export function fill(text: string, lang: Lang, n: number = FREE_MONTHLY_CHECKS) {
  return text
    .replaceAll("{n}", formatNumber(n, lang))
    .replaceAll("{email}", CONTACT_EMAIL);
}

export function formatNumber(n: number, lang: Lang) {
  return new Intl.NumberFormat(lang === "bn" ? "bn-BD" : "en-US").format(n);
}

const en = {
  meta: {
    title: "InboxKnock. Knock before you send.",
    description:
      "Free email verification. Check if an email address is real before you send. Fewer bounces and a safer domain. No email is sent to the address you check.",
    ogAlt: "InboxKnock. Knock before you send.",
    locale: "en_US",
  },
  a11y: {
    skip: "Skip to the email checker",
    menu: "Menu",
    closeMenu: "Close menu",
    primaryNav: "Main",
    langSwitch: "Language",
    backToTop: "Back to top",
  },
  nav: {
    how: "How it works",
    results: "Results",
    faq: "FAQ",
    cta: "Check an email",
    langLabelEn: "EN",
    langLabelBn: "বাংলা",
  },
  hero: {
    label: "Free email verification",
    h1: ["Knock before", "you send."],
    sub: "Check every email before you hit send. Fewer bounces. A safer domain.",
    small: "Free. No email is sent to the address you check.",
    door: {
      ready: "Ready",
      soon: "Opening soon",
      knocking: "Knocking",
      error: "No answer",
      limit: "Limit reached",
      joined: "On the list",
    },
  },
  checker: {
    inputLabel: "Email address",
    placeholder: "name@company.com",
    button: "Check an email",
    checking: "Checking",
    demoBadge: "Demo result",
    demoNote: "Local development only. This is not a real check.",
    statusLabel: "Status",
    meaningLabel: "What it means",
    actionLabel: "What to do",
    another: "Check another email",
    csvToggle: "Or upload a CSV",
    singleToggle: "Check one email",
    remaining: "{left} free checks left this month.",
    remainingLow: "Only {left} free checks left this month. Plan your next list with care.",
    hints: {
      empty: "Type an email address, like name@company.com.",
      spaces: "Remove the spaces.",
      noAt: "Add an @ and a domain, like name@company.com.",
      manyAt: "Use only one @.",
      noLocal: "Add the name part before the @.",
      noDomain: "Add the domain after the @.",
      noDot: "The domain needs a dot, like company.com.",
      badChars: "This has characters an email address cannot use.",
      ok: "Looks right. Press Enter to check.",
      typo: "Did you mean {suggestion}?",
      useTypo: "Use this",
    },
    errors: {
      empty: "Type an email address first. Then press Enter.",
      format: "This is not a complete email address. Fix the part shown below, then try again.",
      server: "Something went wrong on our side. Try again in a minute.",
      timeout: "The mail server took too long to answer. Try again in a minute.",
      offline: "You seem to be offline. Check your connection, then try again.",
      limit: "You have used all your free checks for this month. Write to {email} if you need more.",
      tooMany: "Too many checks in a short time. Wait a minute, then try again.",
    },
    results: {
      valid: { meaning: "The mailbox exists.", action: "Send." },
      invalid: { meaning: "The mailbox does not exist.", action: "Remove it." },
      risky: { meaning: "Catch-all, disposable, role or possible spam trap address.", action: "Decide with care." },
      risky_catch_all: { meaning: "This domain accepts every address, so the mailbox cannot be confirmed.", action: "Decide with care." },
      risky_disposable: { meaning: "This is a temporary inbox that will stop working soon.", action: "Decide with care. Most senders remove these." },
      risky_role: { meaning: "This is a shared address, like info@, read by a team.", action: "Decide with care. Write to a person when you can." },
      risky_spam_trap: {
        meaning: "This looks like a spam trap, such as a misspelled Gmail domain. Mail sent here can get your domain blocked.",
        action: "Remove it, or fix the typo.",
      },
      invalid_format: { meaning: "The address is not written correctly.", action: "Remove it, or fix the typo." },
      invalid_no_domain: { meaning: "This domain does not exist.", action: "Remove it, or fix the typo." },
      invalid_no_mx: { meaning: "This domain has no mail server, so it cannot receive email.", action: "Remove it." },
      invalid_mailbox: { meaning: "The mail server says this mailbox does not exist.", action: "Remove it." },
      unknown: { meaning: "The mail server did not give a clear answer.", action: "Check again later." },
    },
    freeNote: "This is a free email provider, like Gmail or Yahoo.",
    checksTitle: "What we checked",
    checkNames: {
      syntax: "Format",
      domain: "Domain",
      mx: "Mail server (MX)",
      smtp: "Mailbox (SMTP)",
      disposable: "Disposable",
      role: "Role address",
      free: "Free provider",
      catch_all: "Catch-all",
      spam_trap: "Spam trap risk",
    },
    checkStates: {
      pass: "OK",
      fail: "Failed",
      warn: "Flagged",
      info: "Yes",
      no: "No",
      unknown: "No answer",
      skipped: "Not needed",
    },
  },
  early: {
    inputLabel: "Your email",
    placeholder: "you@company.com",
    button: "Get early access",
    sending: "Sending",
    small: "Checking opens soon. We will only email you about InboxKnock.",
    success: "You are on the list. We will write to you when checking opens.",
    closed: "Sign-up is not open on this site yet. Write to {email} and we will add you by hand.",
    error: "We could not save your email. Try again, or write to {email}.",
  },
  csv: {
    title: "Check a CSV file",
    drop: "Drop a CSV file here",
    or: "or",
    choose: "Choose a file",
    help: "One row per contact. We find the email column for you. Up to 5 MB.",
    reading: "Reading the file",
    found: "Emails found in the column “{column}”: {count}.",
    columnLabel: "Email column",
    preview: "Preview of the first rows",
    duplicates: "Duplicates, checked only once: {count}.",
    badFormat: "Rows not written as emails: {count}. They are marked Invalid without using a check.",
    start: "Check the list ({count})",
    progress: "Checked {done} of {total}",
    stop: "Stop",
    stopped: "Stopped. {done} of {total} checked. You can download what is done.",
    done: "Done. Emails checked: {total}.",
    limitHit: "Your free checks ran out after {done} of {total}. Download what is done, or write to {email} for more.",
    summary: "Valid {valid}. Invalid {invalid}. Risky {risky}. Unknown {unknown}.",
    download: "Download checked list (CSV)",
    downloadValid: "Download Valid only",
    another: "Check another file",
    remove: "Remove file",
    errors: {
      type: "This is not a CSV file. Save your sheet as .csv, then try again.",
      size: "This file is larger than 5 MB. Split it into smaller files, then try again.",
      empty: "This file has no rows. Check that you saved the right sheet.",
      noColumn: "We could not find a column with email addresses. Choose the column from the list.",
      read: "We could not read this file. Save it again as CSV (UTF-8), then try again.",
    },
  },
  problem: {
    label: "The problem",
    h2: "Bad lists hurt good domains.",
    text: "Every email that bounces tells mail providers you may not know who you are writing to. Send enough of them and your real emails start missing the inbox.",
    shield: "yourdomain.com",
    bounced: "Bounced",
  },
  how: {
    label: "How it works",
    h2: "Three steps. No email sent.",
    steps: [
      { title: "Upload", text: "Paste one email or upload a CSV." },
      { title: "Knock", text: "We ask the mail server if the mailbox exists." },
      { title: "Send", text: "Download a clean list and send with confidence." },
    ],
  },
  checks: {
    label: "What we check",
    h2: "One knock. Ten checks.",
    items: [
      { title: "Format", text: "Is the address written correctly?" },
      { title: "Domain", text: "Does the domain exist?" },
      { title: "Mail server", text: "Does the domain have a mail server (MX record)?" },
      { title: "Mailbox", text: "Will the mail server take mail for this address? We ask over SMTP and stop before any message is sent." },
      { title: "Disposable", text: "Is it a temporary inbox that will stop working soon?" },
      { title: "Role address", text: "Is it a shared inbox like info@, support@ or admin@?" },
      { title: "Free provider", text: "Is it Gmail, Yahoo, Outlook or another free provider?" },
      { title: "Catch-all", text: "Does this domain accept every address?" },
      { title: "Spam trap risk", text: "Does it show signs of a spam trap, like a misspelled Gmail domain? No tool can find every trap." },
      { title: "Duplicates", text: "Is the same email in your list more than once? It is checked only once." },
    ],
  },
  results: {
    label: "Results",
    h2: "A clear answer for every address.",
    pick: "Choose a status to see how the door answers.",
    items: {
      valid: { name: "Valid", meaning: "The mailbox exists.", action: "Send." },
      invalid: { name: "Invalid", meaning: "The mailbox does not exist.", action: "Remove it." },
      risky: { name: "Risky", meaning: "Catch-all, disposable, role or possible spam trap address.", action: "Decide with care." },
      unknown: { name: "Unknown", meaning: "The server did not answer.", action: "Check again later." },
    },
  },
  who: {
    label: "Who it is for",
    h2: "Built for people who send cold email.",
    text: "For lead-gen freelancers and small agencies who build lists for clients and cannot afford to burn a domain.",
  },
  free: {
    label: "Free",
    h2: "Free to use.",
    text: "Check up to {n} emails a month with a free account.",
    unit: "emails a month",
    button: "Clean your first list",
  },
  faq: {
    label: "FAQ",
    h2: "Questions, answered.",
    items: [
      { q: "Does it send an email to the address?", a: "No. We check with the mail server without sending a message." },
      { q: "Is it really free?", a: "Yes. Each free account can check up to {n} emails a month." },
      { q: "Why are some results Risky?", a: "Some domains accept every address, so the mailbox cannot be confirmed for certain." },
      { q: "Can I use it for spam?", a: "No. Accounts used for spam or purchased lists will be closed." },
    ],
  },
  final: {
    h2: "Check your list before your list checks you.",
    button: "Clean your first list",
  },
  footer: {
    line: "InboxKnock. Knock before you send.",
    terms: "Terms",
    privacy: "Privacy",
  },
  mobileCta: "Check an email",
  notFound: {
    title: "Nobody answered.",
    text: "This page does not exist. It may have moved.",
    home: "Go to the home page",
  },
  legal: {
    updated: "Last updated",
    todo: "TODO for the owner",
    back: "Back to InboxKnock",
  },
};

export type Copy = typeof en;

const bn: Copy = {
  meta: {
    title: "InboxKnock. পাঠানোর আগে নক করুন।",
    description:
      "ফ্রি email verification। পাঠানোর আগে দেখে নিন ইমেইল ঠিকানাটা আসল কি না। Bounce কমবে, domain থাকবে নিরাপদ। যে ঠিকানা চেক করবেন, সেখানে কোনো ইমেইল যায় না।",
    ogAlt: "InboxKnock. পাঠানোর আগে নক করুন।",
    locale: "bn_BD",
  },
  a11y: {
    skip: "সরাসরি email checker-এ যান",
    menu: "Menu",
    closeMenu: "Menu বন্ধ করুন",
    primaryNav: "প্রধান",
    langSwitch: "ভাষা",
    backToTop: "উপরে ফিরে যান",
  },
  nav: {
    how: "কীভাবে কাজ করে",
    results: "Results",
    faq: "FAQ",
    cta: "ইমেইল চেক করুন",
    langLabelEn: "EN",
    langLabelBn: "বাংলা",
  },
  hero: {
    label: "ফ্রি email verification",
    h1: ["পাঠানোর আগে", "নক করুন।"],
    sub: "Send চাপার আগে প্রতিটি ইমেইল চেক করে নিন। Bounce কম। Domain নিরাপদ।",
    small: "ফ্রি। যে ঠিকানা চেক করবেন, সেখানে কোনো ইমেইল যায় না।",
    door: {
      ready: "Ready",
      soon: "শীঘ্রই খুলছে",
      knocking: "নক করছি",
      error: "উত্তর নেই",
      limit: "Limit শেষ",
      joined: "List-এ আছেন",
    },
  },
  checker: {
    inputLabel: "ইমেইল ঠিকানা",
    placeholder: "name@company.com",
    button: "ইমেইল চেক করুন",
    checking: "চেক করছি",
    demoBadge: "Demo result",
    demoNote: "শুধু local development-এর জন্য। এটা আসল চেক নয়।",
    statusLabel: "Status",
    meaningLabel: "এর মানে",
    actionLabel: "এখন কী করবেন",
    another: "আরেকটি ইমেইল চেক করুন",
    csvToggle: "অথবা CSV upload করুন",
    singleToggle: "একটি ইমেইল চেক করুন",
    remaining: "এই মাসে আর {left}টি ফ্রি চেক বাকি।",
    remainingLow: "এই মাসে আর মাত্র {left}টি ফ্রি চেক বাকি। পরের list ভেবেচিন্তে চেক করুন।",
    hints: {
      empty: "একটি ইমেইল ঠিকানা লিখুন, যেমন name@company.com।",
      spaces: "Space গুলো মুছে দিন।",
      noAt: "একটি @ আর domain যোগ করুন, যেমন name@company.com।",
      manyAt: "শুধু একটি @ রাখুন।",
      noLocal: "@-এর আগে নামের অংশটা লিখুন।",
      noDomain: "@-এর পরে domain লিখুন।",
      noDot: "Domain-এ একটি dot লাগবে, যেমন company.com।",
      badChars: "এতে এমন character আছে যা ইমেইল ঠিকানায় চলে না।",
      ok: "ঠিক আছে মনে হচ্ছে। চেক করতে Enter চাপুন।",
      typo: "আপনি কি {suggestion} লিখতে চেয়েছিলেন?",
      useTypo: "এটা নিন",
    },
    errors: {
      empty: "আগে একটি ইমেইল ঠিকানা লিখুন। তারপর Enter চাপুন।",
      format: "ঠিকানাটা পুরো হয়নি। নিচে দেখানো অংশটা ঠিক করে আবার চেষ্টা করুন।",
      server: "আমাদের দিকে একটা সমস্যা হয়েছে। এক মিনিট পরে আবার চেষ্টা করুন।",
      timeout: "Mail server উত্তর দিতে অনেক সময় নিচ্ছে। এক মিনিট পরে আবার চেষ্টা করুন।",
      offline: "আপনি মনে হয় offline। Internet connection দেখে আবার চেষ্টা করুন।",
      limit: "এই মাসের সব ফ্রি চেক শেষ। আরও লাগলে {email}-এ লিখুন।",
      tooMany: "অল্প সময়ে অনেক চেক হয়ে গেছে। এক মিনিট অপেক্ষা করে আবার চেষ্টা করুন।",
    },
    results: {
      valid: { meaning: "Mailbox আছে।", action: "পাঠান।" },
      invalid: { meaning: "Mailbox নেই।", action: "List থেকে বাদ দিন।" },
      risky: { meaning: "Catch-all, disposable, role বা সম্ভাব্য spam trap ঠিকানা।", action: "ভেবে সিদ্ধান্ত নিন।" },
      risky_catch_all: { meaning: "এই domain সব ঠিকানার মেইল নিয়ে নেয়, তাই mailbox আছে কি না নিশ্চিত বলা যায় না।", action: "ভেবে সিদ্ধান্ত নিন।" },
      risky_disposable: { meaning: "এটা একটা অস্থায়ী inbox, কিছুদিন পরেই বন্ধ হয়ে যাবে।", action: "ভেবে সিদ্ধান্ত নিন। বেশিরভাগ sender এগুলো বাদ দেন।" },
      risky_role: { meaning: "এটা info@-এর মতো একটা shared ঠিকানা, একটা team পড়ে।", action: "ভেবে সিদ্ধান্ত নিন। পারলে নির্দিষ্ট মানুষকে লিখুন।" },
      risky_spam_trap: {
        meaning: "এটা spam trap মনে হচ্ছে, যেমন ভুল বানানের Gmail domain। এখানে মেইল গেলে আপনার domain block হতে পারে।",
        action: "বাদ দিন, অথবা typo ঠিক করুন।",
      },
      invalid_format: { meaning: "ঠিকানাটা সঠিকভাবে লেখা নয়।", action: "বাদ দিন, অথবা typo ঠিক করুন।" },
      invalid_no_domain: { meaning: "এই domain-টা নেই।", action: "বাদ দিন, অথবা typo ঠিক করুন।" },
      invalid_no_mx: { meaning: "এই domain-এ কোনো mail server নেই, তাই এখানে ইমেইল যায় না।", action: "List থেকে বাদ দিন।" },
      invalid_mailbox: { meaning: "Mail server বলছে এই mailbox নেই।", action: "List থেকে বাদ দিন।" },
      unknown: { meaning: "Mail server পরিষ্কার উত্তর দেয়নি।", action: "পরে আবার চেক করুন।" },
    },
    freeNote: "এটা Gmail বা Yahoo-এর মতো একটা ফ্রি email provider।",
    checksTitle: "আমরা যা চেক করেছি",
    checkNames: {
      syntax: "Format",
      domain: "Domain",
      mx: "Mail server (MX)",
      smtp: "Mailbox (SMTP)",
      disposable: "Disposable",
      role: "Role ঠিকানা",
      free: "ফ্রি provider",
      catch_all: "Catch-all",
      spam_trap: "Spam trap ঝুঁকি",
    },
    checkStates: {
      pass: "ঠিক আছে",
      fail: "বাতিল",
      warn: "সতর্কতা",
      info: "হ্যাঁ",
      no: "না",
      unknown: "উত্তর নেই",
      skipped: "দরকার হয়নি",
    },
  },
  early: {
    inputLabel: "আপনার ইমেইল",
    placeholder: "you@company.com",
    button: "Get early access",
    sending: "পাঠাচ্ছি",
    small: "চেক করার সুবিধা শীঘ্রই খুলছে। শুধু InboxKnock নিয়েই আপনাকে ইমেইল করব।",
    success: "আপনি list-এ আছেন। চেক চালু হলেই আপনাকে জানাব।",
    closed: "এই site-এ এখনো sign-up চালু হয়নি। {email}-এ লিখুন, আমরা নিজে আপনাকে যোগ করে নেব।",
    error: "আপনার ইমেইল save করা যায়নি। আবার চেষ্টা করুন, অথবা {email}-এ লিখুন।",
  },
  csv: {
    title: "CSV file চেক করুন",
    drop: "CSV file এখানে ছেড়ে দিন",
    or: "অথবা",
    choose: "File বেছে নিন",
    help: "প্রতি row-তে একজন contact। Email column আমরাই খুঁজে নেব। সর্বোচ্চ 5 MB।",
    reading: "File পড়ছি",
    found: "“{column}” column-এ {count}টি ইমেইল পাওয়া গেছে।",
    columnLabel: "Email column",
    preview: "প্রথম কয়েকটি row",
    duplicates: "{count}টি duplicate একবারই চেক হবে।",
    badFormat: "{count}টি row ইমেইলের মতো লেখা নয়। কোনো চেক খরচ না করেই এগুলো Invalid দেখানো হবে।",
    start: "{count}টি ইমেইল চেক করুন",
    progress: "{total}টির মধ্যে {done}টি চেক হয়েছে",
    stop: "থামান",
    stopped: "থামানো হয়েছে। {total}টির মধ্যে {done}টি চেক হয়েছে। যা হয়েছে download করতে পারেন।",
    done: "শেষ। {total}টি ইমেইল চেক হয়েছে।",
    limitHit: "{total}টির মধ্যে {done}টি চেক করার পর ফ্রি চেক শেষ হয়ে গেছে। যা হয়েছে download করুন, অথবা আরও লাগলে {email}-এ লিখুন।",
    summary: "Valid {valid}। Invalid {invalid}। Risky {risky}। Unknown {unknown}।",
    download: "চেক করা list download করুন (CSV)",
    downloadValid: "শুধু Valid download করুন",
    another: "আরেকটি file চেক করুন",
    remove: "File সরান",
    errors: {
      type: "এটা CSV file নয়। Sheet-টা .csv হিসেবে save করে আবার চেষ্টা করুন।",
      size: "File-টা 5 MB-এর বেশি বড়। ছোট ছোট file-এ ভাগ করে আবার চেষ্টা করুন।",
      empty: "এই file-এ কোনো row নেই। ঠিক sheet-টা save করেছেন কি না দেখুন।",
      noColumn: "ইমেইল ঠিকানার column খুঁজে পাওয়া যায়নি। List থেকে column-টা বেছে দিন।",
      read: "File-টা পড়া যায়নি। CSV (UTF-8) হিসেবে আবার save করে চেষ্টা করুন।",
    },
  },
  problem: {
    label: "সমস্যা",
    h2: "খারাপ list ভালো domain নষ্ট করে।",
    text: "প্রতিটি bounce হওয়া ইমেইল mail provider-দের জানিয়ে দেয়, আপনি হয়তো জানেন না কাকে লিখছেন। এমন যথেষ্ট ইমেইল গেলে আপনার আসল ইমেইলও inbox-এ পৌঁছানো বন্ধ হয়ে যায়।",
    shield: "yourdomain.com",
    bounced: "Bounced",
  },
  how: {
    label: "কীভাবে কাজ করে",
    h2: "তিনটি ধাপ। কোনো ইমেইল পাঠানো হয় না।",
    steps: [
      { title: "Upload", text: "একটি ইমেইল paste করুন, অথবা CSV upload করুন।" },
      { title: "নক", text: "আমরা mail server-কে জিজ্ঞেস করি mailbox-টা আছে কি না।" },
      { title: "পাঠান", text: "পরিষ্কার list download করুন, তারপর নিশ্চিন্তে পাঠান।" },
    ],
  },
  checks: {
    label: "আমরা কী চেক করি",
    h2: "একটি নক। দশটি চেক।",
    items: [
      { title: "Format", text: "ইমেইল ঠিকানাটা কি সঠিকভাবে লেখা?" },
      { title: "Domain", text: "Domain-টা কি আসলে আছে?" },
      { title: "Mail server", text: "Domain-এ কি mail server (MX record) আছে?" },
      { title: "Mailbox", text: "Mail server কি এই ঠিকানার মেইল নেবে? আমরা SMTP-তে জিজ্ঞেস করি, আর কোনো message পাঠানোর আগেই থেমে যাই।" },
      { title: "Disposable", text: "এটা কি এমন অস্থায়ী inbox, যা কিছুদিন পরেই বন্ধ হয়ে যাবে?" },
      { title: "Role ঠিকানা", text: "এটা কি info@, support@ বা admin@-এর মতো shared inbox?" },
      { title: "ফ্রি provider", text: "এটা কি Gmail, Yahoo, Outlook বা অন্য কোনো ফ্রি provider?" },
      { title: "Catch-all", text: "এই domain কি সব ঠিকানার মেইলই নিয়ে নেয়?" },
      { title: "Spam trap ঝুঁকি", text: "এতে কি spam trap-এর লক্ষণ আছে, যেমন ভুল বানানের Gmail domain? কোনো tool সব trap ধরতে পারে না।" },
      { title: "Duplicate", text: "একই ইমেইল কি list-এ একাধিকবার আছে? থাকলে সেটা একবারই চেক হয়।" },
    ],
  },
  results: {
    label: "Results",
    h2: "প্রতিটি ঠিকানার পরিষ্কার উত্তর।",
    pick: "একটি status বেছে নিন, দেখুন দরজা কী উত্তর দেয়।",
    items: {
      valid: { name: "Valid", meaning: "Mailbox আছে।", action: "পাঠান।" },
      invalid: { name: "Invalid", meaning: "Mailbox নেই।", action: "List থেকে বাদ দিন।" },
      risky: { name: "Risky", meaning: "Catch-all, disposable, role বা সম্ভাব্য spam trap ঠিকানা।", action: "ভেবে সিদ্ধান্ত নিন।" },
      unknown: { name: "Unknown", meaning: "Server উত্তর দেয়নি।", action: "পরে আবার চেক করুন।" },
    },
  },
  who: {
    label: "কাদের জন্য",
    h2: "যারা cold email পাঠান, তাদের জন্য তৈরি।",
    text: "Lead-gen freelancer আর ছোট agency-দের জন্য, যারা client-এর জন্য list বানান এবং একটা domain-ও হারানোর ঝুঁকি নিতে পারেন না।",
  },
  free: {
    label: "ফ্রি",
    h2: "ব্যবহার ফ্রি।",
    text: "ফ্রি account দিয়ে মাসে {n}টি পর্যন্ত ইমেইল চেক করুন।",
    unit: "ইমেইল প্রতি মাসে",
    button: "প্রথম list পরিষ্কার করুন",
  },
  faq: {
    label: "FAQ",
    h2: "আপনার প্রশ্ন, আমাদের উত্তর।",
    items: [
      { q: "যে ঠিকানা চেক করি, সেখানে কি ইমেইল যায়?", a: "না। কোনো message না পাঠিয়েই আমরা mail server-এর সাথে চেক করি।" },
      { q: "সত্যিই কি ফ্রি?", a: "হ্যাঁ। প্রতিটি ফ্রি account মাসে {n}টি পর্যন্ত ইমেইল চেক করতে পারে।" },
      { q: "কিছু result Risky আসে কেন?", a: "কিছু domain সব ঠিকানার মেইলই নিয়ে নেয়, তাই mailbox আছে কি না নিশ্চিতভাবে বলা যায় না।" },
      { q: "Spam-এর জন্য কি ব্যবহার করা যাবে?", a: "না। Spam বা কেনা list-এর জন্য ব্যবহার করা account বন্ধ করে দেওয়া হবে।" },
    ],
  },
  final: {
    h2: "আপনার list আপনাকে চেক করার আগে, আপনিই list চেক করুন।",
    button: "প্রথম list পরিষ্কার করুন",
  },
  footer: {
    line: "InboxKnock. পাঠানোর আগে নক করুন।",
    terms: "শর্তাবলি",
    privacy: "গোপনীয়তা",
  },
  mobileCta: "ইমেইল চেক করুন",
  notFound: {
    title: "কেউ দরজা খোলেনি।",
    text: "এই page-টা নেই। হয়তো সরানো হয়েছে।",
    home: "Home page-এ যান",
  },
  legal: {
    updated: "সর্বশেষ update",
    todo: "Owner-এর জন্য TODO",
    back: "InboxKnock-এ ফিরে যান",
  },
};

export const COPY: Record<Lang, Copy> = { en, bn };

export function getCopy(lang: Lang): Copy {
  return COPY[lang] ?? en;
}

export function isLang(value: string | undefined | null): value is Lang {
  return value === "en" || value === "bn";
}

/* ------------------------------------------------------------------ */
/* Legal pages. Owner must complete every TODO before launch.          */
/* ------------------------------------------------------------------ */

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "todo"; text: string };

export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalPage = { title: string; intro: string; updated: string; sections: LegalSection[] };

export const LEGAL: Record<Lang, { terms: LegalPage; privacy: LegalPage }> = {
  en: {
    terms: {
      title: "Terms of use",
      intro: "These terms explain how you may use InboxKnock. Please read them before you check any email.",
      updated: "TODO: add the date these terms take effect.",
      sections: [
        {
          heading: "Who we are",
          blocks: [
            { type: "p", text: "InboxKnock is an email verification tool. It checks whether an email address can receive mail. It does not send email to the addresses you check." },
            { type: "todo", text: "Add the legal name, registered address and country of the business that runs InboxKnock." },
          ],
        },
        {
          heading: "No spam. No purchased lists.",
          blocks: [
            { type: "p", text: "You may not use InboxKnock to send, plan or support spam. This rule is not optional." },
            { type: "list", items: [
              "Do not check lists you bought, rented or scraped without permission.",
              "Do not check addresses to send unwanted bulk email.",
              "Do not use InboxKnock to break any anti-spam or privacy law that applies to you.",
            ] },
            { type: "p", text: "We will close accounts that are used for spam or purchased lists." },
          ],
        },
        {
          heading: "Your account and the free limit",
          blocks: [
            { type: "p", text: `A free account can check up to ${formatNumber(FREE_MONTHLY_CHECKS, "en")} emails a month. We may change this limit. We will show the current limit on this site.` },
            { type: "p", text: "Keep your sign-in details safe. You are responsible for what happens in your account." },
          ],
        },
        {
          heading: "Results",
          blocks: [
            { type: "p", text: "Each result is our best reading of what the mail server told us at the time. Mail servers can change their answer. A Valid result does not promise that your email will reach the inbox." },
          ],
        },
        {
          heading: "Ending your use",
          blocks: [
            { type: "p", text: "You can stop using InboxKnock at any time. We may suspend or close an account that breaks these terms." },
          ],
        },
        {
          heading: "Legal details",
          blocks: [
            { type: "todo", text: "Add the governing law, the court or place for disputes, limitation of liability and warranty wording. Have a lawyer review these terms." },
          ],
        },
        {
          heading: "Contact",
          blocks: [{ type: "p", text: `Questions about these terms: ${CONTACT_EMAIL}` }],
        },
      ],
    },
    privacy: {
      title: "Privacy",
      intro: "This page explains what we collect when you use InboxKnock and why.",
      updated: "TODO: add the date this policy takes effect.",
      sections: [
        {
          heading: "What we collect",
          blocks: [
            { type: "list", items: [
              "The email addresses you check, so we can check them.",
              "Files you upload for a CSV check. The file is read in your browser. Only the email addresses are sent to us to check.",
              "Your own email address, if you create an account or join the early access list.",
              "Basic technical data such as your IP address, used to stop abuse and enforce the free limit.",
            ] },
            { type: "p", text: "We remember your language choice in a small cookie called ik_lang. It holds only \"en\" or \"bn\"." },
          ],
        },
        {
          heading: "What we do not do",
          blocks: [
            { type: "list", items: [
              "We do not send any email to the addresses you check.",
              "We do not sell the addresses you check.",
            ] },
          ],
        },
        {
          heading: "How long we keep data",
          blocks: [
            { type: "todo", text: "State how long checked addresses, results, uploaded data and logs are kept, and when they are deleted. Do not publish this page until this is filled in." },
          ],
        },
        {
          heading: "Who we share data with",
          blocks: [
            { type: "todo", text: "List the service providers that process data (for example hosting and the verification backend) and where they are located." },
          ],
        },
        {
          heading: "Your rights",
          blocks: [
            { type: "p", text: `You can ask us what data we hold about you, and ask us to correct or delete it. Write to ${CONTACT_EMAIL}.` },
            { type: "todo", text: "Add the rights and legal basis that apply in the countries you serve, and the name of the data controller." },
          ],
        },
        {
          heading: "Contact",
          blocks: [{ type: "p", text: `Questions about privacy: ${CONTACT_EMAIL}` }],
        },
      ],
    },
  },
  bn: {
    terms: {
      title: "ব্যবহারের শর্তাবলি",
      intro: "InboxKnock কীভাবে ব্যবহার করবেন, এই শর্তগুলো তা বলে দেয়। কোনো ইমেইল চেক করার আগে একবার পড়ে নিন।",
      updated: "TODO: এই শর্ত কোন তারিখ থেকে কার্যকর, তা যোগ করুন।",
      sections: [
        {
          heading: "আমরা কারা",
          blocks: [
            { type: "p", text: "InboxKnock একটি email verification tool। এটা চেক করে কোনো ইমেইল ঠিকানা মেইল নিতে পারে কি না। যে ঠিকানাগুলো চেক করেন, সেখানে এটা কোনো ইমেইল পাঠায় না।" },
            { type: "todo", text: "InboxKnock যে প্রতিষ্ঠান চালায়, তার আইনি নাম, নিবন্ধিত ঠিকানা ও দেশ যোগ করুন।" },
          ],
        },
        {
          heading: "Spam নয়। কেনা list নয়।",
          blocks: [
            { type: "p", text: "Spam পাঠাতে, পরিকল্পনা করতে বা তাতে সাহায্য করতে InboxKnock ব্যবহার করা যাবে না। এই নিয়মের কোনো ব্যতিক্রম নেই।" },
            { type: "list", items: [
              "কেনা, ভাড়া নেওয়া বা অনুমতি ছাড়া scrape করা list চেক করবেন না।",
              "অনাকাঙ্ক্ষিত bulk email পাঠানোর জন্য ঠিকানা চেক করবেন না।",
              "আপনার জন্য প্রযোজ্য কোনো anti-spam বা privacy আইন ভাঙতে InboxKnock ব্যবহার করবেন না।",
            ] },
            { type: "p", text: "Spam বা কেনা list-এর জন্য ব্যবহার করা account আমরা বন্ধ করে দেব।" },
          ],
        },
        {
          heading: "আপনার account ও ফ্রি limit",
          blocks: [
            { type: "p", text: `একটি ফ্রি account মাসে ${formatNumber(FREE_MONTHLY_CHECKS, "bn")}টি পর্যন্ত ইমেইল চেক করতে পারে। আমরা এই limit বদলাতে পারি। বর্তমান limit এই site-এ দেখানো থাকবে।` },
            { type: "p", text: "আপনার sign-in তথ্য নিরাপদে রাখুন। আপনার account-এ যা হয়, তার দায় আপনার।" },
          ],
        },
        {
          heading: "Results",
          blocks: [
            { type: "p", text: "প্রতিটি result হলো সেই মুহূর্তে mail server আমাদের যা বলেছে, তার ভিত্তিতে আমাদের সেরা বিচার। Mail server পরে উত্তর বদলাতে পারে। Valid result মানেই ইমেইল inbox-এ পৌঁছাবে, এমন নিশ্চয়তা নয়।" },
          ],
        },
        {
          heading: "ব্যবহার বন্ধ করা",
          blocks: [
            { type: "p", text: "যেকোনো সময় InboxKnock ব্যবহার বন্ধ করতে পারেন। এই শর্ত ভাঙলে আমরা account স্থগিত বা বন্ধ করতে পারি।" },
          ],
        },
        {
          heading: "আইনি বিষয়",
          blocks: [
            { type: "todo", text: "প্রযোজ্য আইন, বিরোধ নিষ্পত্তির আদালত বা স্থান, দায়ের সীমা ও warranty-র ভাষা যোগ করুন। একজন আইনজীবীকে দিয়ে শর্তগুলো দেখিয়ে নিন।" },
          ],
        },
        {
          heading: "যোগাযোগ",
          blocks: [{ type: "p", text: `এই শর্ত নিয়ে প্রশ্ন থাকলে: ${CONTACT_EMAIL}` }],
        },
      ],
    },
    privacy: {
      title: "গোপনীয়তা",
      intro: "InboxKnock ব্যবহার করলে আমরা কী তথ্য নিই এবং কেন, এই page তা বলে।",
      updated: "TODO: এই নীতি কোন তারিখ থেকে কার্যকর, তা যোগ করুন।",
      sections: [
        {
          heading: "আমরা কী তথ্য নিই",
          blocks: [
            { type: "list", items: [
              "যে ইমেইল ঠিকানাগুলো চেক করেন, যাতে সেগুলো চেক করা যায়।",
              "CSV চেকের জন্য upload করা file। File-টা আপনার browser-এই পড়া হয়। শুধু ইমেইল ঠিকানাগুলো চেকের জন্য আমাদের কাছে আসে।",
              "আপনার নিজের ইমেইল ঠিকানা, যদি account খোলেন বা early access list-এ যোগ দেন।",
              "IP address-এর মতো সাধারণ technical তথ্য, অপব্যবহার ঠেকাতে আর ফ্রি limit মানাতে।",
            ] },
            { type: "p", text: "আপনার ভাষার পছন্দ আমরা ik_lang নামের ছোট একটি cookie-তে মনে রাখি। এতে শুধু \"en\" বা \"bn\" থাকে।" },
          ],
        },
        {
          heading: "আমরা যা করি না",
          blocks: [
            { type: "list", items: [
              "যে ঠিকানাগুলো চেক করেন, সেখানে আমরা কোনো ইমেইল পাঠাই না।",
              "যে ঠিকানাগুলো চেক করেন, সেগুলো আমরা বিক্রি করি না।",
            ] },
          ],
        },
        {
          heading: "তথ্য কতদিন রাখি",
          blocks: [
            { type: "todo", text: "চেক করা ঠিকানা, result, upload করা তথ্য ও log কতদিন রাখা হয় এবং কখন মুছে ফেলা হয়, তা লিখুন। এটা পূরণ না করে এই page প্রকাশ করবেন না।" },
          ],
        },
        {
          heading: "কাদের সাথে তথ্য শেয়ার করি",
          blocks: [
            { type: "todo", text: "যে service provider-রা তথ্য process করে (যেমন hosting ও verification backend) এবং তারা কোথায় অবস্থিত, তা লিখুন।" },
          ],
        },
        {
          heading: "আপনার অধিকার",
          blocks: [
            { type: "p", text: `আপনার সম্পর্কে আমরা কী তথ্য রাখি তা জানতে, সংশোধন করতে বা মুছে ফেলতে বলতে পারেন। ${CONTACT_EMAIL}-এ লিখুন।` },
            { type: "todo", text: "যে দেশগুলোতে সেবা দেন, সেখানে প্রযোজ্য অধিকার ও আইনি ভিত্তি এবং data controller-এর নাম যোগ করুন।" },
          ],
        },
        {
          heading: "যোগাযোগ",
          blocks: [{ type: "p", text: `গোপনীয়তা নিয়ে প্রশ্ন থাকলে: ${CONTACT_EMAIL}` }],
        },
      ],
    },
  },
};

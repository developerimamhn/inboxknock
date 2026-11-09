import fs from "node:fs";
import path from "node:path";

/**
 * Built-in lists. Kept short on purpose. Run `npm run update-lists` to download
 * the large community list of disposable domains into DATA_DIR/disposable.txt;
 * it is merged in on start.
 */

const DISPOSABLE_BUILTIN = `
0-mail.com 10minutemail.com 10minutemail.net 10minutemail.co.uk 20minutemail.com 33mail.com
anonbox.net anonymbox.com binkmail.com bobmail.info burnermail.io chacuo.net clrmail.com
discard.email discardmail.com discardmail.de dispostable.com dropmail.me
emailondeck.com emailtemporanea.net emailtemporar.ro email-fake.com emailfake.com emailinator.com
fakeinbox.com fakemail.net fakemailgenerator.com getairmail.com getnada.com nada.email
guerrillamail.com guerrillamail.net guerrillamail.org guerrillamail.biz guerrillamail.de guerrillamailblock.com
grr.la sharklasers.com spam4.me pokemail.net
harakirimail.com inboxbear.com incognitomail.org jetable.org kasmail.com linshiyouxiang.net
mail-temp.com mail.tm mail7.io mailcatch.com maildrop.cc mailinator.com mailinator.net mailinator2.com
mailnesia.com mailnull.com mailpoof.com mailsac.com mailtemp.info mintemail.com moakt.com mohmal.com
mt2015.com mytemp.email mytrashmail.com nowmymail.com objectmail.com
one-time.email onetimemail.com owlymail.com proxymail.eu rcpt.at receiveee.com
spamavert.com spambog.com spambox.us spamex.com spamgourmet.com spaml.de spamspot.com spamthisplease.com
tempail.com tempinbox.com tempmail.com tempmail.net tempmail.dev tempmail.plus temp-mail.org temp-mail.io
tempmailo.com tempmailaddress.com tempr.email tempemail.net throwawaymail.com throwam.com trash-mail.com
trashmail.com trashmail.de trashmail.net trashmail.me trashmail.io trashymail.com
yopmail.com yopmail.net yopmail.fr cool.fr.nf jetable.fr.nf nospam.ze.tc nomail.xl.cx mega.zik.dj
wegwerfmail.de wegwerfmail.net wegwerfemail.de einrot.com spoofmail.de 1secmail.com 1secmail.net 1secmail.org
emailnax.com fexpost.com fextemp.com mailbox.in.ua tmail.ws tmpmail.org tmpmail.net tmpeml.com
byom.de zetmail.com vomoto.com xojxe.com eelmail.com mvrht.net armyspy.com cuvox.de dayrep.com
einrot.de fleckens.hu gustr.com jourrapide.com rhyta.com superrito.com teleworm.us
`;

/** Shared inbox names read by a team, not a person. */
const ROLE_BUILTIN = `
info admin administrator sales support contact hello office team help helpdesk billing accounts accounting
finance marketing careers jobs job hr recruiting recruitment noreply no-reply donotreply do-not-reply
postmaster webmaster hostmaster abuse security privacy legal compliance press media pr news newsletter
enquiries enquiry inquiries inquiry service services customerservice customercare care feedback
root sysadmin it ops operations devops mail email all everyone staff booking bookings reservations
orders order shop store partners partnership business hi hey welcome team-lead management
`;

/** Big free mailbox providers. Not risky on their own, shown for information. */
const FREE_BUILTIN = `
gmail.com googlemail.com
yahoo.com yahoo.co.uk yahoo.co.in yahoo.ca yahoo.com.au yahoo.fr yahoo.de yahoo.es yahoo.it yahoo.co.jp
yahoo.com.br yahoo.com.sg yahoo.com.ph yahoo.in ymail.com rocketmail.com
outlook.com outlook.co.uk outlook.in hotmail.com hotmail.co.uk hotmail.fr hotmail.de hotmail.it hotmail.es
live.com live.co.uk live.in live.fr msn.com passport.com windowslive.com
aol.com aim.com icloud.com me.com mac.com
proton.me protonmail.com protonmail.ch pm.me tutanota.com tutanota.de tuta.io
gmx.com gmx.net gmx.de gmx.at gmx.ch web.de t-online.de freenet.de
mail.com email.com usa.com post.com
yandex.com yandex.ru ya.ru mail.ru inbox.ru list.ru bk.ru rambler.ru
zoho.com zohomail.com fastmail.com fastmail.fm hushmail.com
qq.com 163.com 126.com sina.com sohu.com yeah.net naver.com daum.net hanmail.net
rediffmail.com libero.it virgilio.it laposte.net orange.fr free.fr sfr.fr wanadoo.fr
btinternet.com sky.com comcast.net verizon.net att.net sbcglobal.net cox.net
`;

/**
 * Big providers whose near misses are known spam trap ("typo trap") domains.
 * Only long names here: one-letter changes to short names like yahoo.com hit real
 * companies (wahoo.com), so those are matched through KNOWN_TYPOS only.
 */
export const TYPO_TARGETS = ["gmail.com", "hotmail.com", "outlook.com", "googlemail.com", "protonmail.com"];

/** Known typo domains. Same list the website uses for its suggestion. */
export const KNOWN_TYPOS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gnail.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
};

/** Local parts that are used as traps or report straight to blocklists. */
const TRAP_LOCAL_RE = /^(spam|spamtrap|spam-trap|spam_trap|trap|honeypot|honey-pot|blackhole|black-hole|blocklist|blacklist)$|spamtrap|honeypot/;

const words = (s: string) => s.split(/\s+/).map((w) => w.trim().toLowerCase()).filter(Boolean);

const disposable = new Set(words(DISPOSABLE_BUILTIN));
const role = new Set(words(ROLE_BUILTIN));
const free = new Set(words(FREE_BUILTIN));

let loadedExtra = 0;

/** Merge DATA_DIR/disposable.txt (one domain per line, # comments) if it exists. */
export function loadExtraLists(dataDir: string) {
  const file = path.join(dataDir, "disposable.txt");
  if (!fs.existsSync(file)) return 0;
  const before = disposable.size;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const d = line.replace(/#.*/, "").trim().toLowerCase();
    // Never let a downloaded list mark a big free provider as disposable.
    if (d && !free.has(d)) disposable.add(d);
  }
  loadedExtra = disposable.size - before;
  return loadedExtra;
}

export function listSizes() {
  return { disposable: disposable.size, role: role.size, free: free.size, extraDisposable: loadedExtra };
}

/** True for the domain itself or any parent domain on the list (a.b.mailinator.com). */
function inDomainSet(set: Set<string>, domain: string) {
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    if (set.has(labels.slice(i).join("."))) return true;
  }
  return false;
}

export function isDisposable(domain: string) {
  return inDomainSet(disposable, domain);
}

export function isFree(domain: string) {
  return free.has(domain);
}

export function isRole(local: string) {
  const base = local.toLowerCase().split("+")[0];
  return role.has(base);
}

function editDistance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // swapped neighbours count as one typo
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  }
  return dp[a.length][b.length];
}

/** The provider this domain looks like a typo of, or null. */
export function typoOf(domain: string): string | null {
  if (free.has(domain)) return null;
  if (KNOWN_TYPOS[domain]) return KNOWN_TYPOS[domain];
  for (const target of TYPO_TARGETS) {
    if (domain !== target && editDistance(domain, target) === 1) return target;
  }
  return null;
}

export function isTrapLocal(local: string) {
  return TRAP_LOCAL_RE.test(local.toLowerCase());
}

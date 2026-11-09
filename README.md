# InboxKnock website

Marketing site for InboxKnock, a free email verification tool.
Next.js App Router, TypeScript, Tailwind CSS 4, GSAP with ScrollTrigger and SplitText, Lenis.

## Run it

```bash
npm install
cp .env.example .env.local   # then fill in what you have
npm run dev                  # site + local verifier, real checks. http://localhost:3000
npm run dev:demo             # site only, mock results labelled "Demo result"
npm run lint
npm run build && npm start
```

## Where things live

| What | Where |
| --- | --- |
| All copy (English and Bangla) and settings | `src/config/site.ts` |
| Free limit, contact email, backend URL | `FREE_MONTHLY_CHECKS`, `CONTACT_EMAIL`, `VERIFY_API_URL` in `src/config/site.ts` |
| Terms and Privacy text | `LEGAL` in `src/config/site.ts` |
| Checker (single, CSV, early access) | `src/components/checker/` |
| Verify API route | `src/app/api/verify/route.ts` |
| Scroll animation (lazy loaded) | `src/motion/init.ts` |
| Door states (CSS only) | `.door` rules in `src/app/globals.css` |
| Language routing | `src/proxy.ts` (English at `/`, Bangla at `/bn`) |

## Checker modes

| `VERIFY_API_URL` | Environment | Hero shows |
| --- | --- | --- |
| set | any | Live checker and CSV upload |
| not set | `npm run dev:demo` | Checker with mock results, each labelled "Demo result". A real DNS lookup still marks dead domains Invalid |
| not set | production | Early access form with the button "Get early access" |

The mode is decided at build time, so rebuild after you change `VERIFY_API_URL`.

Demo rules (development only): a name with `invalid` or `bounce` gives Invalid,
`unknown` gives Unknown, `catchall` gives Risky catch-all, `info@`, `sales@` and similar give Risky role,
throwaway domains such as `mailinator.com` give Risky disposable. Everything else is Valid.

## Backend contract

`/api/verify` checks the format first, then sends:

```
POST {VERIFY_API_URL}
Content-Type: application/json
Authorization: Bearer {VERIFY_API_KEY}      (only if set)
X-Forwarded-For: <visitor IP>
Cookie: <visitor cookies>                   (so the backend can see a signed-in account)

{ "email": "name@company.com" }
```

Expected reply:

```json
{
  "status": "valid | invalid | risky | unknown",
  "reason": "format | no_domain | no_mx | mailbox | disposable | spam_trap | catch_all | role",
  "free": true,
  "suggestion": "name@gmail.com",
  "checks": {
    "syntax": "pass", "domain": "pass", "mx": "pass", "smtp": "pass",
    "disposable": "pass", "role": "pass", "free": "info", "catch_all": "pass", "spam_trap": "pass"
  },
  "remaining": 9950,
  "limit": 10000
}
```

- Only `status` is required. Each check is one of `pass`, `fail`, `warn`, `info`, `unknown`, `skipped`.
  The result card lists the checks, and unknown names or states are dropped.
- When `remaining` is sent, the result card shows it, and it warns when 10% or less is left.
- Reply `402`, or `{ "error": "limit" }`, when the visitor has no checks left.
- Reply `429` for too many requests in a short time.
- Anything else that is not a valid reply is shown as a server error. Timeout is 20 seconds.
- Duplicates are removed in the browser before a CSV run, so each address is checked once.

The `verifier/` folder is a backend that follows this contract. See below.

Early access sign-ups are sent as JSON `{ email, lang, source, at }` to `EARLY_ACCESS_WEBHOOK_URL`.
If that is not set, the form says sign-up is not open and asks the visitor to email you. It never pretends to save.

## Verifier service (`verifier/`)

A small Node service with no dependencies that does the real checks:

| # | Check | How |
| --- | --- | --- |
| 1 | Syntax | Same rules as the site |
| 2 | Domain | DNS lookup. NXDOMAIN gives Invalid `no_domain` |
| 3 | MX | MX records, falling back to A/AAAA (RFC 5321). No mail host or a null MX gives Invalid `no_mx` |
| 4 | SMTP mailbox | Connects to the MX on port 25 and sends EHLO, STARTTLS when offered, MAIL FROM and RCPT TO, then QUIT. No message is sent |
| 5 | Disposable | Built-in list, plus the community list (about 10,000 domains) after `npm run update-lists` |
| 6 | Role | info@, support@, admin@, sales@ and about 70 more |
| 7 | Free provider | Gmail, Yahoo, Outlook, iCloud, Proton, GMX, Yandex and others. Information only, not a risk |
| 8 | Catch-all | A second RCPT TO with a random address on the same domain |
| 9 | Spam trap risk | Typo domains of big providers (gmial.com, hotmial.com), and trap-like names (spamtrap@, honeypot@) |
| 10 | Duplicates | Done in the browser for CSV files |

Status rules, in order: bad format, no domain, no mail server or a rejected mailbox give **Invalid**.
Disposable, a spam trap signal, catch-all or a role address give **Risky**.
A server that blocks, greylists or times out gives **Unknown**. It is never guessed as Valid or Invalid.

```bash
cd verifier
cp .env.example .env        # set API_KEY, SMTP_HELO, SMTP_FROM
npm run update-lists        # optional, downloads the disposable list
npm test                    # 21 tests, uses a fake mail server
npm run check -- name@company.com
npm start                   # http://localhost:8787/verify
```

Then in the website `.env.local`: `VERIFY_API_URL=http://<server>:8787/verify` and `VERIFY_API_KEY=<same API_KEY>`, and rebuild.

### Where to run it

The SMTP check needs **outbound port 25**. Vercel, Netlify and most serverless hosts block it.
Run the verifier on a small VPS whose provider allows port 25 (some, like Hetzner or DigitalOcean, open it on request).
For mail servers to answer:

- Give the server a hostname (for example `verify.inboxknock.com`) with an A record, and set the **reverse DNS (PTR)** of its IP to the same name. Use that name as `SMTP_HELO`.
- Use an address on your domain as `SMTP_FROM`, and add the server IP to that domain's SPF record.
- Use an IP that is not on Spamhaus or other block lists. Home and office connections usually are, and then Outlook and others answer with a block. The verifier reports those as Unknown.
- Keep `SMTP_PER_HOST` low. Too many probes at once get an IP blocked.

Run it with systemd or pm2, behind HTTPS (Caddy or nginx), and keep `API_KEY` set so only your website can call it.
Usage counts are kept per visitor IP in `verifier/data/usage.json` until the site has accounts.

### Deploying on Vercel (services)

`vercel.json` deploys both parts as one Vercel project:

- `app` (the Next.js site, repo root) is public on every path.
- `verifier` (`verifier/`, built from its `Dockerfile` as a container) is internal. It has no public URL.
- The `app` service has a binding that injects the verifier's internal URL as `VERIFIER_URL` at runtime.
  `/api/verify` calls `VERIFIER_URL` + `verify`. Do not set `VERIFIER_URL` yourself.

Project environment variables to set in Vercel (both services see them):

| Variable | Value |
| --- | --- |
| `VERIFY_API_KEY` | A long random secret. The site sends it, and the verifier checks it |
| `SMTP_HELO`, `SMTP_FROM` | See "Where to run it" above |
| `NEXT_PUBLIC_SITE_URL`, `EARLY_ACCESS_WEBHOOK_URL` | As before |

Leave `VERIFY_API_URL` empty on Vercel. A build on Vercel always shows the live checker, because the verifier ships in the same deployment.
Test locally with `vercel dev`, which runs both services and injects the binding.

Two limits of running the verifier on Vercel:

- **Port 25.** Vercel, like most clouds, is expected to block outbound port 25. Then the mailbox and catch-all checks cannot run.
  The verifier notices after three failed connections, answers Unknown at once for 10 minutes, and shows `"port25Blocked": true`
  in `/health`. Every other check still works. For full mailbox checks, run the same Docker image on a VPS with port 25 open,
  set `VERIFY_API_URL` and remove the `verifier` service from `vercel.json`.
- **Usage counts.** `usage.json` lives inside the container, so counts reset when an instance restarts, and two instances keep separate counts.
  Move them to a shared store (for example Upstash Redis) before you rely on the monthly limit.

### What no verifier can promise

- Yahoo, AOL and many company servers accept every address. Those come back Risky catch-all.
- Spam traps are kept secret by the people who run them. The verifier finds known signs only, so a clean result is not proof that an address is not a trap.

## Motion and comfort

A tiny script in `<head>` picks a mode before the first paint:

- `motion`: full animation.
- `calm`: final states with simple fades. Used for `prefers-reduced-motion`, Save-Data, 2G,
  devices with 2 GB memory or 2 CPU cores or less, and a battery at 20% or less that is not charging.

All content is server rendered in its final state. The GSAP bundle loads after the page is idle and
only adds motion. If it fails to load, nothing stays hidden. Lenis runs only on mouse and trackpad devices.
The "How it works" pin runs only on screens at least 1024 px wide and 640 px tall.

## Owner to-do before launch

See the list in the hand-off notes, and every yellow TODO box on `/terms` and `/privacy`.

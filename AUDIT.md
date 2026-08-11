# Bingo Home Buyers — Pre-Install Audit

**Scope:** ground-truth state of the site before adding a third-party visitor-identification pixel site-wide.
**Repo:** `pete0723/Bingo-Home-Buyers` (branch `main`, local working tree at `~/Downloads/Bingo Home Buyers Web Design`).
**Mode:** read-only. No site files were modified. This file is the only thing written.

---

## BLOCKERS
*Anything that would prevent or silently break a site-wide third-party script install, most important first.*

1. **No Content-Security-Policy exists anywhere — GOOD NEWS, this is the #1 thing you asked about.**
   Checked `vercel.json`, `build.mjs`, `serve.mjs`, every `.html` file (no `http-equiv` meta CSP), and there is **no middleware, no `next.config.js`, no `_headers` file, no `"headers"` block in `vercel.json`**. A new pixel will **not** be silently blocked by CSP. (`vercel.json` is 5 lines: `cleanUrls`, `buildCommand`, `outputDirectory` only.)

2. **There is NO shared layout / template / `_document`. "Site-wide" is a manual, per-file paste.**
   This is hand-authored static HTML — not Next.js, not any framework. Each page has its own independent `<head>`. To be truly site-wide you must paste the snippet into **five** separate files, and **two of them currently have zero tracking**:
   - `index.html` (has Meta Pixel)
   - `thank-you.html` (has Meta Pixel)
   - `sell-inherited-house.html` (has Meta Pixel)
   - `privacy-policy.html` — **no pixel today**
   - `terms-of-service.html` — **no pixel today**
   The failure mode is silent: add it to the homepage, forget the others, and you have partial coverage with no error. This is the biggest practical risk.

3. **`build.mjs` copies dist/ from an explicit allowlist — a new hosted JS file will be dropped unless you register it.**
   `build.mjs:16-31` copies only the files named in the `ASSETS` array into `dist/`. If the visitor-ID vendor needs you to host a `.js` file in the repo, adding the file is not enough — you must add its name to `ASSETS` or it never ships. **Inline `<head>` snippets inside the existing HTML files are safe** (the HTML files are already in the allowlist).

4. **Privacy policy does not disclose third-party advertising / visitor-identification vendors.**
   `privacy-policy.html:166-167` (Cookies section) and `:131-132` (automatic collection) describe "cookies, web beacons, and similar technologies" **generically** and name no vendor. It does **not** mention Meta/Facebook, ad networks, visitor de-anonymization, or sharing data with third-party advertising partners. A visitor-ID pixel resolves anonymous traffic to real identities and ships it to a third party — that is a materially different disclosure than what's written. This is a compliance/factual gap, not a technical blocker. Not legal advice — flag to counsel before launch.

5. **No cookie/consent banner exists.** No CookieBot/OneTrust/consent-gating logic anywhere (searched all files). Nothing gates the current pixel and nothing will gate the new one. Whether that's acceptable is a legal question, not a technical one — flagging factually.

**Non-blocking but worth knowing before you touch anything:**
- The Google Maps loader (`index.html:84`) already reads a CSP nonce: `a.nonce = m.querySelector("script[nonce]")?.nonce || ""`. Today that resolves to `""` (no CSP). If you ever add a nonce-based CSP later, every existing inline script (Meta pixel, Maps loader, form JS) would need a nonce or it breaks. Not relevant to a plain pixel add today.
- `api/meta-capi-lead.js:5-8` header comment says **"SCAFFOLD ONLY — NOT wired to the live form yet."** This is **stale/wrong** — the client fetch is live (`index.html:1895`, `sell-inherited-house.html:432`) and git commit `7e18b4b` "Activate server-side CAPI Lead" turned it on. Don't trust that comment.

---

## 1. Framework & structure

- **Framework:** Plain static HTML. **Not** Next.js, not App Router, not Pages Router, no React. No `package.json` at all (confirmed absent; `api/meta-capi-lead.js:20-21` documents this deliberately). Build is a 64-line Node script (`build.mjs`) that copies files into `dist/` and does one string replacement for the Google Maps key. Hosted on Vercel (`vercel.json`, `.vercel/project.json` → project `bingo-home-buyers`).
- **Root layout / `_document` wrapping every page:** **Not present.** Each HTML file is fully standalone with its own `<head>` and its own copy of the pixel snippet. No shared include mechanism.
- **Routes/pages that exist** (5 content routes; `cleanUrls: true` in `vercel.json` strips `.html`):
  - `/` → `index.html` (main landing page)
  - `/thank-you` → `thank-you.html`
  - `/sell-inherited-house` → `sell-inherited-house.html` (advertorial landing page)
  - `/privacy-policy` → `privacy-policy.html`
  - `/terms-of-service` → `terms-of-service.html`
  - Serverless: `/api/meta-capi-lead` → `api/meta-capi-lead.js`
  - Static assets: favicons, `opt-in.png`, `sell-inherited-house-hero.png`, `Brand_assets/`, plus `privacy-policy.pdf` / `terms-of-service.pdf`.
- **Is the thank-you page a real route or client-side state?** **It is a REAL, separate route** — its own file `thank-you.html`, listed in `build.mjs:19`, reached by a **full navigation** `window.location.href = '/thank-you'` (`index.html:1943`, `sell-inherited-house.html:437`). It is not a client-side state toggle on the form page. It's `noindex,nofollow` (`thank-you.html:10`) and not linked in nav. **This matters:** the Meta Lead dedup design depends on this being a real navigation that carries an eventID across page loads via `sessionStorage`.

---

## 2. Existing tracking — full inventory

**Only one tracking system is present: Meta Pixel. No GA, no GTM, no other pixels.**

| Script | File & placement | Fires on |
|---|---|---|
| Meta Pixel base (`fbevents.js`) + `PageView` | `index.html:12-27` (`<head>`) | every homepage load |
| Meta Pixel base + `PageView` | `thank-you.html:13-42` (`<head>`) | every thank-you load |
| Meta Pixel base + `PageView` | `sell-inherited-house.html:12-18` (`<head>`) | every advertorial load |
| Meta `<noscript>` PageView img | `index.html:24-26`, `thank-you.html:39-41`, (advertorial has script only) | no-JS fallback |

- **NOT tracked:** `privacy-policy.html` and `terms-of-service.html` have **no pixel at all** (0 references to the pixel ID).
- Other external domains loaded (not analytics): Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`), Google Maps JS (`maps.googleapis.com`, via `index.html:84` loader), Tailwind CDN (`cdn.tailwindcss.com` — on `index.html` and `sell-inherited-house.html` only), and the GHL webhook `services.leadconnectorhq.com` (form POST target).

### Meta Pixel — settled
- **Pixel ID: `1397499955522386`** (init at `index.html:21`, `thank-you.html:22`, `sell-inherited-house.html:18`; CAPI `api/meta-capi-lead.js:25`).
- **Is it site-wide or thank-you-only?** **Neither, exactly. It is on 3 of the 5 pages: the homepage, the advertorial, and the thank-you page — but NOT on privacy-policy or terms.** The base code + `PageView` load in the `<head>` of all three content pages. The **`Lead` event** is deliberately *not* fired on `PageView`; it fires only on form submit and again on `/thank-you` (see below). So: PageView is on the 3 content pages; Lead is submission-gated.
- **Domain verification** meta tag present: `index.html:7`.

### Every place a Meta `Lead` event fires
1. `index.html:1889` — `fbq('track','Lead',{},{eventID: leadEventId})` at homepage form **submit**.
2. `thank-you.html:33` — `fbq('track','Lead',{},{eventID: leadEventId})` on `/thank-you` load, reusing the **same** eventID from `sessionStorage`.
3. `sell-inherited-house.html:430` — `fbq('track','Lead',...)` at advertorial form **submit**.
4. `api/meta-capi-lead.js:79` — server-side CAPI `Lead` with the same `event_id`.

**Can Lead fire more than once per submission?** Yes — **by design, and it's handled correctly via a shared eventID, so Meta dedupes to a single Lead.** Walk-through of a homepage submit:
- Submit handler generates ONE `leadEventId` (`index.html:1885`, `crypto.randomUUID()`), stores it in `sessionStorage['bingo_lead_eventid']` (`:1888`), fires **browser Lead #1** (`:1889`), fires **CAPI Lead** with the same id (`:1895-1905`), then navigates to `/thank-you`.
- `/thank-you` reads the same id back (`thank-you.html:31`), fires **browser Lead #2** with it (`:33`), then **deletes the key** (`:34`).
- Net: 2 browser fires + 1 server fire, all sharing one `event_id` → Meta collapses them into **one** Lead (matched on `event_name` + `event_id`).

**Guards against runaway/phantom fires (all good):**
- Not React → **no StrictMode double-render, no re-render** double-fire risk. Plain HTML.
- `/thank-you` only fires if the id exists in `sessionStorage`, and deletes it immediately → a **refresh, back-nav, or direct/bookmarked visit to `/thank-you` cannot re-fire** Lead (`thank-you.html:24-37`).
- Double-click on submit is blocked by `submitBtn.disabled = true` (`index.html:1873`) plus the immediate navigation.
- **Minor caveats** (not defects): (a) the advertorial CAPI call sends `email:''` (`sell-inherited-house.html:433`) so its Leads match on phone+IP+UA only — weaker match quality than the homepage. (b) A genuine second submission (user goes back and resubmits) correctly generates a new id and is counted as a new Lead — intended.

### eventID generation & dedup — end to end
- Generated once per submit: `leadEventId = crypto.randomUUID()` (fallback `'lead-'+Date.now()+'-'+random`) at `index.html:1885` / `sell-inherited-house.html:428`.
- Persisted for the cross-page handoff: `sessionStorage.setItem('bingo_lead_eventid', leadEventId)`.
- Passed to browser pixel as `{eventID: leadEventId}`; passed to CAPI as JSON `eventID` in the POST body (`index.html:1900`), which the server maps to `event_id` (`api/meta-capi-lead.js:57, 81`). Consumed and cleared on `/thank-you`. Dedup key is `event_name='Lead'` + `event_id`.

### GTM / GA
- **Not present.** No Google Tag Manager container, no GA4/UA measurement ID, no `dataLayer`, no `gtag`. (The only Google properties are Fonts and Maps.)

---

## 3. The lead form

Two forms, identical webhook target, slightly different fields.

**Homepage `#lead-form` (`index.html:995`)** — two-step:
| Field | `name` | Required | Notes |
|---|---|---|---|
| Property address | `address-input` (visible, id only) | required | Google Places autocomplete |
| address / city / state / zip / formattedAddress | `address`,`city`,`state`,`zip`,`formattedAddress` | hidden | filled from Places (`index.html:1005-1009`) |
| utm_source/medium/campaign/content, fbclid | those names | hidden | tracking (`:1011-1015`) |
| Full Name | `fullName` | **required** (`:1030`) | |
| Phone | `phone` | **required** (`:1031`) | `tel` |
| Email | `email` | **required** (`:1032`) | |
| Timeline | `timeline` | **required** (`:1033`) | select: ASAP / 30 days / 1-3mo / 3-6mo / Just exploring |
| Terms+Privacy consent | (checkbox, no name) | **required** (`:1045`) | |
| `smsConsent` (transactional) | `smsConsent` | optional (`:1049`) | A2P: cannot be required |
| `smsPromoConsent` (marketing) | `smsPromoConsent` | optional (`:1053`) | |

**Advertorial `#lead-form` (`sell-inherited-house.html:151`, `novalidate`)** — two-step, **no email, no timeline field**:
- address (+ hidden city/state/zip/formattedAddress), `fullName` required, `phone` required, agree-to-terms checkbox required (`:176`), `smsConsent` optional (`:177`). Email and timeline are hard-coded empty in the payload (`:410`).

**Where submission POSTs:** both POST to the **GoHighLevel webhook**
`https://services.leadconnectorhq.com/hooks/Mc8LKR5wEkc4aWf5o4gd/webhook-trigger/d882f58a-4620-45e7-b153-3acf1179ef05`
(`index.html:1933`, `sell-inherited-house.html:257/435`) as `application/x-www-form-urlencoded`, `mode:'no-cors'`, `keepalive:true`, fire-and-navigate. Handler: `index.html:1865-1950`. Phone is normalized to `+1` + digits (`:1915`).

**UTM capture:** read from the landing URL's query string at page load and written into hidden inputs — `const trackParams = new URLSearchParams(window.location.search)` then copied (`index.html:1672-1673`). Params captured: **`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `fbclid`**. **`utm_term` is NOT captured.** Advertorial uses an inline `qp()` reader for the same five (`sell-inherited-house.html:413-414`). Values persist only for the current page load — **no cookie/localStorage persistence**, so a UTM present on the ad-click URL survives the two-step form but is lost if the user navigates internally first.

**fbclid capture:** same mechanism — read from `window.location.search` `fbclid` param only (`index.html:1673`, hidden input `:1015`; advertorial `:414`). It is **not** reconstructed from the `_fbc` cookie, and **not** forwarded to CAPI (see §7).

**Would a new async `<head>` script break anything?** No. Nothing in the form logic depends on head-script ordering; the Meta pixel and Maps loader are already async and independently guarded (`typeof google === 'undefined'` check at `index.html:1681`; pixel calls wrapped in `if (window.fbq)` and try/catch at `:1884-1890`). A new async pixel added to the head is low-risk. Only realistic conflicts: a vendor script that overrides globals like `fbq`/`fetch`, or one that injects heavy synchronous work — neither is typical for a visitor-ID pixel.

---

## 4. Blockers for adding a third-party script

- **CSP:** **Not present** — see BLOCKERS #1. Checked `vercel.json`, `build.mjs`, `serve.mjs`, all HTML (`http-equiv`), and confirmed no middleware/`next.config`/`_headers`. Nothing to quote because nothing exists.
- **Other security headers:** **None.** `vercel.json` sets no `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`. (Vercel adds its own default HSTS at the edge, but nothing in this repo constrains third-party scripts.)
- **Cookie/consent banner or consent-gating:** **Not present.** No banner, no CookieBot/OneTrust, no consent flag checked before firing the pixel.

---

## 5. Privacy policy & terms

Both exist as real routes: **`/privacy-policy`** (`privacy-policy.html`) and **`/terms-of-service`** (`terms-of-service.html`). Both also shipped as PDFs. Both linked in the footer (`index.html:1491-1492`) and form consent lines.

**Verbatim — Privacy Policy language on tracking / cookies / third-party data / sharing:**

> "When you visit our website, we may automatically collect certain information, including your IP address, browser type, operating system, referring URLs, pages viewed, and the dates and times of your visits. We may also use cookies, web beacons, and similar technologies to collect this information." (`privacy-policy.html:132`)

> **Cookies and Tracking Technologies** — "We may use cookies and similar tracking technologies to enhance your experience on our website. You can set your browser to refuse all or some cookies, or to alert you when cookies are being sent. If you disable cookies, some features of the website may not function properly." (`privacy-policy.html:166-167`)

> **Information Sharing and Disclosure** — "We do not sell your personal information. We may share your information with: Service providers: Third parties that assist us in operating our website, conducting our business, or servicing you (e.g., title companies, attorneys, contractors); Legal requirements...; Business transfers..." (`privacy-policy.html:158-164`)

> **No Sharing (SMS)** — "No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. Information sharing to subcontractors in support services, such as customer service, is permitted. All other use case categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties." (`privacy-policy.html:154`)

**Verbatim — Terms of Service:**

> **Privacy (SMS)** — "Your phone number and opt-in data will not be sold, rented, or shared with any third parties or affiliates for their marketing purposes. Please refer to our Privacy Policy for full details on how we handle your information." (`terms-of-service.html:143`)

The Terms otherwise contain no cookie/pixel/analytics language.

**Gap relevant to your install:** neither document names Meta/Facebook, an advertising network, or a visitor-identification vendor, and neither discloses de-anonymizing visitors or sharing site-visit data with an ad-tech third party. The "No Sharing" clauses above are scoped to *mobile/SMS opt-in data*, but a visitor-ID pixel operates on *web-visit data* — a category the policy currently only covers with the generic "cookies, web beacons, and similar technologies" line. Flagging factually; confirm with counsel.

---

## 6. Landing page copy

### Main landing page (`/`, `index.html`) — full visible copy, verbatim

Nav: How It Works · About · Situations · Areas We Serve · Reviews · FAQ · **Get My Cash Offer**

**Hero:**
Ohio's Trusted Cash Home Buyers
**Sell Your House Fast for Cash**
No repairs, no agents, no hassle. We buy houses across Ohio for cash — get a fair offer in as little as 24 hours and close on your timeline.
• No Fees or Commissions • Close in as Few as 7 Days • Any Condition, Any Situation • Cash in Your Hands at Close
*Bingo Home Buyers LLC*

**Form card:** Get Your Free Cash Offer — "Enter your address for a free, no-obligation cash offer. We'll reach out shortly." → [address] Get My Cash Offer · "Takes 30 seconds · No obligation · No fees" · Full Name / Phone / Email / Select your timeline (ASAP, Within 30 days, 1-3 months, 3-6 months, Just exploring) · consent checkboxes · "Your information is secure and will not be sold or shared with third parties." · SMS Disclosure block.

**How It Works — Three Simple Steps:**
1. **Contact Us** — "Tell us about your property — any condition, any situation. We'll reach out shortly and follow up with a no-obligation cash offer within 24 hours."
2. **Get Your Cash Offer** — "We'll evaluate your home and present a fair, transparent cash offer — no hidden fees, no commissions, no surprises."
3. **Close & Get Paid** — "Pick your closing date — as fast as 7 days or on your schedule. We handle all the paperwork. You walk away with cash."

**Why Bingo — "Sell with Certainty. Sell with Bingo!"** — "Life changes fast — divorce, relocation, inherited property, or just ready to move on. Whatever your reason, we make selling simple. No listing, no showings, no waiting. Just a fair offer and a fast close."

**We Buy Houses In Any Situation:** Facing Foreclosure · Inherited Property · Relocating Fast · Needs Major Repairs (each with a one-line description as shown on page).

**Areas We Serve:** "We buy houses across Ohio…" — Cleveland (Akron, Lakewood, Parma…), Dayton (Kettering, Beavercreek, Springfield…), Columbus (Dublin, Westerville, Grove City…), Cincinnati (Mason, Hamilton, Fairfield…).

**Reviews — "Homeowners Trust Bingo":**
- "I was months behind on my mortgage and facing foreclosure. Bingo stepped in, gave me a fair cash offer, and closed in under two weeks. They saved my credit and gave me a fresh start." — Melissa W., Columbus OH
- "I had a vacant property sitting empty for over a year — it was attracting vandals and costing me in taxes. Bingo bought it as-is with no inspections and no hassle. Wish I'd called them sooner." — Roberta J., Cincinnati OH
- "I was a tired landlord dealing with problem tenants and constant repairs. Bingo took the property off my hands quickly and gave me a fair price. No more late-night phone calls — just peace of mind." — Doris F., Dayton OH

**Stats:** 1,000+ Homeowners Served · 14 Avg Days to Close · $0 Fees & Commissions · 5.0★ Facebook Rating

**FAQ:** How does selling my house for cash work? / How fast can you close? / Do I need to make repairs before selling? / Are there any fees or commissions? / How do you determine your offer price? (full answers on page, `index.html` FAQ section).

**Final CTA — "Ready to Sell Your House Fast?"** — "Get your no-obligation cash offer today. No agents, no repairs, no fees. Just a fair price and a fast closing on your terms." — Get My Cash Offer / Call Us Now.

**Footer:** "We buy houses for cash — fast, fair, and hassle-free. Any condition, any situation." · Company (About Us, How It Works, Reviews, FAQ) · We Buy (Foreclosures, Inherited Homes, Fixer Uppers, Vacant Properties) · Contact: info@bingohomebuyers.com · (614) 964-5684 · Serving Ohio Statewide · © 2026 Bingo Home Buyers · Privacy Policy · Terms of Service.

### Thank-you page (`/thank-you`, `thank-you.html`) — full visible copy, verbatim
- H1: "Thanks — we've got your information."
- "Your request is in. A member of the Bingo Home Buyers team will personally reach out **shortly** to talk through your property and walk you through a no-obligation cash offer."
- "No pressure, no fees, no obligation. Just a straightforward conversation about your options."
- "Need to reach us sooner? Call or text (614) 964-5684."
- Footnote: "Bingo Home Buyers · We buy houses for cash, in any condition. / Return to homepage"

*(The advertorial `/sell-inherited-house` has extensive long-form article copy about the true cost of listing an inherited house; not dumped here per the request, which asked for the main landing page + thank-you page. Available on request.)*

---

## 7. Serverless functions

**Files under `/api`:** exactly one — `api/meta-capi-lead.js` (Vercel serverless, CommonJS, Node 18+ global `fetch`).

**`meta-capi-lead.js` — user parameters sent to Meta Conversions API** (`user_data`, `api/meta-capi-lead.js:64-74`):

| Param | Sent? | Source |
|---|---|---|
| `em` (email) | ✅ **yes** | SHA-256 hashed, `:65-67`. **But** client only sends a real email from the homepage; the advertorial sends `email:''` → no `em`. |
| `ph` (phone) | ✅ **yes** | SHA-256 hashed (digits only), `:66-68` |
| `fn` (first name) | ❌ no | not sent |
| `ln` (last name) | ❌ no | not sent |
| `ct` (city) | ❌ no | not sent |
| `st` (state) | ❌ no | not sent |
| `zp` (zip) | ❌ no | not sent |
| `country` | ❌ no | not sent |
| `external_id` | ❌ no | not sent |
| `fbc` | ⚠️ **supported but never sent** | server reads `body.fbc` (`:70`) but **neither client forwards it** (`index.html:1899-1904`, `sell-inherited-house.html:433` send only eventID/email/phone/eventSourceUrl) |
| `fbp` | ⚠️ **supported but never sent** | server reads `body.fbp` (`:69`) — same as above, never forwarded |

Also sent (not in your list): `client_ip_address` (from `x-forwarded-for`, `:71-72`) and `client_user_agent` (from `body.clientUserAgent` or the request UA header, `:73-74`). Event fields: `event_name:'Lead'`, `event_time`, `event_id` (dedup key), `action_source:'website'`, `event_source_url` (`:76-88`). Auth token `META_CAPI_TOKEN` from env; **if unset the endpoint no-ops with HTTP 200** (`:46-51`). PII is hashed server-side; raw PII is not logged.

**Match-quality note for your install:** CAPI currently matches on `em`+`ph`+`ip`+`ua` (homepage) or `ph`+`ip`+`ua` (advertorial). `fbc`/`fbp` are the highest-value Meta match keys and are wired on the server but **never populated by the client** — leaving match quality on the table today. Relevant if the new visitor-ID vendor also wants `_fbc`/`_fbp`.

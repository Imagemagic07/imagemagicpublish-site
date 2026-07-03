# ImageMagicPublish — Website

Bilingual (EN/FR) luxury site for **ImageMagicPublish LLC** — the book *The Sacred Taboo /
Le Tabou Sacré* and the *Guard Your Temple / Garde Ton Temple* conference project.

Static site (HTML/CSS/vanilla JS). No build step. Deploys as-is to Cloudflare Pages.

## Files
| File | Purpose |
|---|---|
| `index.html` | The whole site (single-page app, 6 sections + templates) |
| `styles.css` | Design system |
| `i18n.js` | **All EN/FR text — edit copy here** |
| `app.js` | Router, language engine, gold particles, forms, reveals |
| `assets/` | Images (covers, portraits, logo). `assets/originals/` = local backups (git-ignored) |
| `_headers` | Cloudflare security + caching headers |
| `robots.txt`, `sitemap.xml` | SEO |
| `404.html` | Branded not-found page |

## Run locally
```
python3 -m http.server 4173 --directory .
# open http://localhost:4173
```

> **Cache note:** CSS/JS are versioned with `?v=N` in `index.html`. **After editing
> `styles.css`, `app.js`, or `i18n.js`, bump every `?v=N` to the next number** so
> browsers load the new file.

---

# 🚀 Go-live checklist

### 1. GitHub
1. Create a new **private** repo (e.g. `imagemagicpublish-site`).
2. From this folder: `git init && git add . && git commit -m "Initial site"` then push.

### 2. Cloudflare Pages (hosting)
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Pick the repo. Build settings: **Framework = None**, **Build command = (empty)**,
   **Output directory = `/`**. Deploy.
3. Every `git push` now auto-deploys.

### 3. Domain + DNS (GoDaddy domain, Cloudflare DNS)
1. In Cloudflare, **Add a site** with your domain → choose **Free** plan.
2. Cloudflare gives you 2 nameservers → set them in **GoDaddy → DNS → Nameservers**.
3. In **Pages → your project → Custom domains**, add `imagemagicpublish.com` and `www`.
4. Cloudflare issues HTTPS automatically.

### 4. Free professional email (skip Google Workspace for now)
- Cloudflare → **Email → Email Routing** → forward `hello@imagemagicpublish.com` → your Gmail.
- In Gmail, add it as a **"Send mail as"** address so replies look professional. $0.

### 5. Analytics (cookieless, no consent banner needed)
- Cloudflare → **Web Analytics** → add your site. No code changes required. Done.
- *(Add Google Analytics 4 later, only when you start running ads — then paste the GA4 tag.)*

---

# 🔌 Integrations — values to collect, and where they go

Paste these when ready and I'll wire them (or follow the notes). Search `index.html` for the
UPPERCASE placeholder to find each spot.

| # | What | You provide | Where it goes |
|---|---|---|---|
| 1 | **Buy the Book** | Amazon KDP product URL | `AMAZON_BOOK_URL` — the 2 "Buy the Book" buttons |
| 2 | **Free Lost Chapter** | MailerLite embedded form / group ID | Lead-magnet form → MailerLite automation emails the PDF |
| 3 | **Lost Chapter PDF** | the PDF file | Upload to `assets/lost-chapter.pdf`; link it in the MailerLite welcome automation |
| 4 | **Newsletter** ("Join the Awakening") | MailerLite form/group ID | the email-capture forms |
| 5 | **Contact / Booking form** | *(decision below)* | `#contactForm` submit handler |
| 6 | **Calendly** | your Calendly link | a "Book a Call" button on Contact/Speaking |
| 7 | **Turnstile (spam)** | Turnstile **site key** + **secret key** | contact form widget + server verify |
| 8 | **Stripe** *(optional/later)* | Payment Link URL(s) | only if selling direct (signed copy / PDF / deposit) |
| 9 | **Meta Pixel** *(later)* | Pixel ID | `<head>` when you start ads |

### Where values go (two places only)

### 📗 Lead magnet + email list (MailerLite) — step by step
1. Create a free **MailerLite** account and verify your sender domain/email.
2. Create **two groups**: `Newsletter` and `Lost Chapter` (Subscribers → Groups).
   Open each group and copy its **ID** from the URL → paste into `CONFIG.newsletterGroup`
   and `CONFIG.lostChapterGroup` in `app.js`. Bump `?v=` after editing.
3. Integrations → **Developer API** → create a token → set it in Cloudflare Pages as
   env var **`MAILERLITE_API_KEY`** (used by both `/api/subscribe` and `/api/contact`).
4. The PDFs are already hosted on the site (`assets/lost-chapter-en.pdf` and `-fr.pdf`), and
   the modal delivers the correct language **instantly on signup** — so delivery works even
   before MailerLite is connected. You don't need an automation just to deliver the file.
5. (Recommended) In MailerLite → **Automations → New** → trigger **"When subscriber joins →
   Lost Chapter"** → **Send email** with a warm welcome + the same download links
   (`https://imagemagicpublish.com/assets/lost-chapter-en.pdf` / `-fr.pdf`) as a backup copy.
6. (Optional) A welcome automation on the `Newsletter` group.

How the site is already wired: the "Join the Awakening" forms and the Lost Chapter modal
POST to `/api/subscribe` (Cloudflare Function, built) which adds the person to the group id
the form sends. Falls back gracefully with a retry message if not configured.

**1. Public links — edit the `CONFIG` block at the top of `app.js`:**
```js
const CONFIG = {
  amazonBookUrl:    "https://www.amazon.com/dp/XXXX",  // Buy the Book buttons
  calendlyUrl:      "https://calendly.com/you/call",   // reveals the "Book a Call" button
  turnstileSiteKey: "0x4AAAAAAA...",                    // Turnstile SITE key (public)
  contactEndpoint:  "/api/contact",                    // leave as-is
  subscribeEndpoint:"/api/subscribe",                  // leave as-is
  newsletterGroup:  "1234567890",                      // MailerLite Newsletter group id
  lostChapterGroup: "0987654321"                       // MailerLite Lost Chapter group id
};
```
Then **bump every `?v=N` to the next number** in `index.html` so browsers reload it.

**2. Secret keys — the contact form is handled by `functions/api/contact.js`** (Cloudflare
Pages Function, already built). It verifies Turnstile, emails you via Resend, and adds each
inquiry to MailerLite as a lead. Set these as **Pages → Settings → Environment variables**
(never in code):

| Variable | Value | Needed for |
|---|---|---|
| `TURNSTILE_SECRET` | Turnstile **secret** key | spam protection |
| `RESEND_API_KEY` | Resend API key | emailing you the inquiry |
| `CONTACT_TO` | your inbox, e.g. `you@imagemagicpublish.com` | " |
| `CONTACT_FROM` | verified Resend sender, e.g. `Website <noreply@imagemagicpublish.com>` | " |
| `MAILERLITE_API_KEY` | MailerLite API key | adding leads to MailerLite |
| `MAILERLITE_GROUP_ID` | MailerLite group id | " |

> Resend needs your sending domain verified (free). Until these are set, the form gracefully
> falls back to opening the visitor's email app — no lead is lost.
> Prefer the simplest possible option instead? Swap the function for **Formspree** (free 50/mo).

---

# 📄 Still to build (no keys needed — can do anytime)
- Legal pages: **Privacy Policy** + **Terms/Disclaimer** (bilingual) → link in footer.
  *(Templates — have a professional review before relying on them.)*
- "Book a Call" Calendly button placement.
- Testimonials + past-event photo/video section (your assets → for the 10/10 pass).

---

# 💰 Cost at launch
MailerLite (≤1k subs) · Pages · GitHub · Calendly · Turnstile · CF Analytics · CF Email · Amazon · Stripe = **$0/mo**.
You start paying only when it's working (≥~1,000 subscribers ≈ $10/mo, or Google Workspace when you want full mailboxes).

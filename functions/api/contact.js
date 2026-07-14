/* =========================================================================
   Cloudflare Pages Function — POST /api/contact
   Verifies Turnstile, emails the inquiry (Resend), and adds the person to
   MailerLite as a tagged lead. All secrets come from Pages env variables:

     TURNSTILE_SECRET     Cloudflare Turnstile secret key   (optional but recommended)
     RESEND_API_KEY       Resend API key                    (email to you)
     CONTACT_TO           where inquiries are sent           e.g. you@imagemagicpublish.com
     CONTACT_FROM         verified Resend sender             e.g. Website <noreply@imagemagicpublish.com>
     MAILERLITE_API_KEY   MailerLite API key                (optional lead capture)
     MAILERLITE_GROUP_ID  MailerLite group id for leads      (optional)

   Set these in Cloudflare → Pages → your project → Settings → Environment variables.
   ========================================================================= */

const esc = (s = "") =>
  String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  const name = (data.name || "").trim();
  const email = (data.email || "").trim();
  const message = (data.message || "").trim();

  // basic validation
  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: "validation" }, 422);
  }
  if ((data.company || "").trim()) return json({ ok: true }); // honeypot: silently accept, drop

  // 1) Turnstile (only enforced when the secret is configured)
  if (env.TURNSTILE_SECRET) {
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", data.token || "");
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) form.append("remoteip", ip);
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: form
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!verify.success) return json({ ok: false, error: "turnstile" }, 403);
  }

  const reason = (data.reason || "General message").trim();
  const results = [];

  // 2) Email the inquiry via Resend
  if (env.RESEND_API_KEY && env.CONTACT_TO && env.CONTACT_FROM) {
    const html = `
      <h2>New inquiry — ${esc(reason)}</h2>
      <p><strong>Name:</strong> ${esc(name)}</p>
      <p><strong>Email:</strong> ${esc(email)}</p>
      <p><strong>Phone:</strong> ${esc(data.phone)}</p>
      <p><strong>Organization:</strong> ${esc(data.organization)}</p>
      <p><strong>Reason:</strong> ${esc(reason)}</p>
      <p><strong>Language:</strong> ${esc(data.lang)}</p>
      <hr><p style="white-space:pre-wrap">${esc(message)}</p>`;
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: email,
        subject: `[${reason}] ${name}`, html
      })
    });
    results.push(["email", r.ok]);
  }

  // A contact/booking message MUST reach the inbox. We do NOT auto-add these
  // people to the mailing list (they didn't opt in), and we only report success
  // if the email was actually delivered. If email isn't configured yet, return
  // 501 so the site falls back to opening the sender's email app addressed to you
  // — that way a booking inquiry is never silently lost.
  const emailed = results.length > 0 && results.every(([, ok]) => ok);
  if (!emailed) return json({ ok: false, error: "email_not_configured" }, 501);
  return json({ ok: true });
}

export const onRequestGet = () => json({ ok: false, error: "method_not_allowed" }, 405);

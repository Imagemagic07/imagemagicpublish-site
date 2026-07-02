/* =========================================================================
   Cloudflare Pages Function — POST /api/subscribe
   Adds an email to a MailerLite group. Used by:
     • the "Join the Awakening" newsletter forms
     • the "Free Lost Chapter" lead-magnet modal
   Joining the Lost Chapter group triggers your MailerLite automation that
   emails the PDF. Secret lives as a Pages env variable:

     MAILERLITE_API_KEY   MailerLite API key

   Set it in Cloudflare → Pages → your project → Settings → Environment variables.
   ========================================================================= */

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }

  const email = (data.email || "").trim();
  const name = (data.name || "").trim();
  const group = (data.group || "").trim(); // MailerLite group id, chosen by the form
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: "email" }, 422);
  if ((data.company || "").trim()) return json({ ok: true }); // honeypot

  if (!env.MAILERLITE_API_KEY) return json({ ok: false, error: "not_configured" }, 501);

  const bodyPayload = { email, fields: name ? { name } : {} };
  if (group) bodyPayload.groups = [group];

  const r = await fetch("https://connect.mailerlite.com/api/subscribers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.MAILERLITE_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    return json({ ok: false, error: "mailerlite", status: r.status, detail: detail.slice(0, 300) }, 502);
  }
  return json({ ok: true });
}

export const onRequestGet = () => json({ ok: false, error: "method_not_allowed" }, 405);

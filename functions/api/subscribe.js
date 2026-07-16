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

  // Custom fields power the automation: branch on language, segment on source.
  // MailerLite matches custom fields by their KEY. This account's fields use the
  // keys `language_save` and `source_m` (display names "Language Save" / "Source_m"),
  // so we write to those. We also set the plain `language`/`source` keys as a
  // fallback — MailerLite silently ignores any key with no matching field, so
  // this stays correct even if the fields are later renamed to the clean keys.
  const fields = {};
  if (name) fields.name = name;
  const setField = (value, ...keys) => { for (const k of keys) fields[k] = value; };
  if (data.language === "fr") setField("Français", "language_save", "language");
  else if (data.language === "en") setField("English", "language_save", "language");
  if (data.source) setField(String(data.source).slice(0, 60), "source_m", "source");

  const bodyPayload = { email, fields };
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

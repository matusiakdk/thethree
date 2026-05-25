/* ============================================================
   functions/api/loops.js
   Cloudflare Pages Function. Proxies waitlist signups to Loops
   so the API key stays server-side (env var LOOPS_API_KEY) and
   never ships to the browser.

   Frontend (scripts/modal.js) POSTs JSON here after a successful
   Supabase insert/enrich. We upsert into Loops via
   /v1/contacts/update (creates if absent, updates if present),
   which fires the "Contact added" workflow on first insert.

   Fire-and-forget on the client — failures here don't break the
   signup, because Supabase is the source of truth.
   ============================================================ */

export async function onRequestPost(context) {
  let payload;
  try {
    payload = await context.request.json();
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  const email = (payload.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "invalid_email" }, 400);
  }

  const apiKey = context.env.LOOPS_API_KEY;
  if (!apiKey) {
    return json({ error: "missing_api_key" }, 500);
  }

  // ---- 1. Upsert the contact in the audience.
  // Runs for both initial signup AND later enrichment. Adds to Loops audience
  // so future campaigns can target by stage/industry/etc.
  const contactBody = { email, userGroup: "Waitlist", source: payload.source || "website" };
  if (payload.firstName) contactBody.firstName = payload.firstName;
  if (payload.stage)     contactBody.stage     = payload.stage;
  if (payload.industry)  contactBody.industry  = payload.industry;
  if (payload.country)   contactBody.country   = payload.country;
  if (payload.howFound)  contactBody.howFound  = payload.howFound;

  let contactRes;
  try {
    contactRes = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(contactBody)
    });
  } catch (e) {
    return json({ error: "loops_unreachable" }, 502);
  }

  // ---- 2. Send the welcome via Transactional API (only on initial signup).
  // Gmail treats transactional sends as user-triggered (higher Primary
  // placement) vs workflow-triggered Audience sends (often Promotions).
  // The `welcome: true` flag is set only on the first JOIN click in modal.js;
  // enrichment updates omit it, so we don't double-send. The corresponding
  // Loops Workflow ("Contact added" → Send email) MUST stay paused — that
  // workflow + this transactional would double-mail every signup.
  const transactionalId = context.env.LOOPS_TRANSACTIONAL_ID;
  if (payload.welcome && transactionalId) {
    try {
      await fetch("https://app.loops.so/api/v1/transactional", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
          transactionalId: transactionalId,
          email: email
        })
      });
    } catch (e) {
      // Silent — contact is in Loops audience, can be welcomed manually if needed.
      // Supabase still has the row so the signup itself is preserved.
    }
  }

  const text = await contactRes.text();
  return new Response(text, {
    status: contactRes.status,
    headers: { "Content-Type": "application/json" }
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}

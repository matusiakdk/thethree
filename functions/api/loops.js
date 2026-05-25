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

  const body = { email, userGroup: "Waitlist", source: payload.source || "website" };
  if (payload.firstName) body.firstName = payload.firstName;
  if (payload.stage)     body.stage     = payload.stage;
  if (payload.industry)  body.industry  = payload.industry;
  if (payload.country)   body.country   = payload.country;
  if (payload.howFound)  body.howFound  = payload.howFound;

  let loopsRes;
  try {
    loopsRes = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": "Bearer " + apiKey
      },
      body: JSON.stringify(body)
    });
  } catch (e) {
    return json({ error: "loops_unreachable" }, 502);
  }

  const text = await loopsRes.text();
  return new Response(text, {
    status: loopsRes.status,
    headers: { "Content-Type": "application/json" }
  });
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}

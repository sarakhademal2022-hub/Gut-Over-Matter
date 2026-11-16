// Suggestion box for Gut Over Matter (Cloudflare Pages Function, URL: /api/suggest).
//
// Suggestions are saved anonymously in the GOM_KV storage binding (no names, no
// IP addresses). To read them: Cloudflare dashboard > Storage & Databases >
// KV > your namespace > look for keys that start with "suggestion:".
// Each visitor can send up to 5 suggestions a day.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  if (origin) {
    let sameSite = false;
    try { sameSite = new URL(origin).host === new URL(request.url).host; } catch (e) { sameSite = false; }
    if (!sameSite) return json({ error: "forbidden" }, 403);
  }
  if (!env.GOM_KV) return json({ error: "not_configured" }, 503);
  if (Number(request.headers.get("content-length") || 0) > 8000) return json({ error: "too_large" }, 413);

  let text = "";
  try {
    const body = await request.json();
    text = typeof body.text === "string" ? body.text.trim().slice(0, 1500) : "";
  } catch (e) {
    return json({ error: "bad_request" }, 400);
  }
  if (!text) return json({ error: "bad_request" }, 400);

  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const visitor = (await sha256(`${ip}|${day}|gom-suggest`)).slice(0, 32);
  const limitKey = `limit:${day}:suggest:${visitor}`;

  try {
    const used = parseInt((await env.GOM_KV.get(limitKey)) || "0", 10) || 0;
    if (used >= 5) return json({ error: "limited" }, 429);
    const stamp = new Date().toISOString();
    const id = crypto.randomUUID().slice(0, 8);
    await Promise.all([
      env.GOM_KV.put(limitKey, String(used + 1), { expirationTtl: 172800 }),
      env.GOM_KV.put(`suggestion:${stamp}:${id}`, JSON.stringify({ text, received: stamp })),
    ]);
    return json({ ok: true });
  } catch (e) {
    return json({ error: "unavailable" }, 503);
  }
}

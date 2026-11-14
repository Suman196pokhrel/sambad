/*
 * Sambad demo feedback collector (Cloudflare Worker).
 * The clickable mock queues feedback in the visitor's browser and posts it
 * here in small batches. This Worker is the only place feedback is trusted:
 * it checks the origin, verifies a Cloudflare Turnstile token (proof a human
 * is at the page), validates every field, rate limits per IP and per visitor,
 * drops duplicates, and stores rows in D1. One event laptop serves many
 * visitors, so per-person limits key on the visitor id, not the device. GET returns everything collected,
 * behind a bearer token that only the project owner has.
 *
 * Secrets (wrangler secret put): TURNSTILE_SECRET, ADMIN_TOKEN, IP_SALT.
 * Vars (wrangler.toml): ALLOWED_ORIGINS. ALLOW_NO_TURNSTILE="true" is for
 * local testing only and must never be set in production.
 */

export const LIMITS = { batch: 10, bodyBytes: 32000, perIp10m: 60, perIpDay: 600, perVisitorDay: 40, minFillMs: 1200, ipDedupeChars: 30 };
const MAX = { message: 2000, screen: 120, route: 200, target: 200, role: 40, company_size: 40, contact: 200, demo_role: 20 };
const KINDS = ['feedback', 'vote', 'question', 'price'];
const TOPICS = ['confusing', 'missing', 'idea', 'bug', 'pricing', 'like'];
const COLS = ['id', 'received_at', 'created_at', 'device', 'visitor', 'kind', 'rating', 'topics', 'message', 'screen', 'route', 'target', 'role', 'company_size', 'contact', 'demo_role'];

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = okOrigin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } : {};
    const json = (status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });

    if (url.pathname !== '/feedback') return json(404, { error: 'not_found' });
    if (req.method === 'OPTIONS') return new Response(null, { status: okOrigin ? 204 : 403, headers: cors });
    if (req.method === 'GET') return list(req, env, url);
    if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
    if (!okOrigin) return json(403, { error: 'origin_not_allowed' });

    const raw = await req.text();
    if (new TextEncoder().encode(raw).length > LIMITS.bodyBytes) return json(413, { error: 'too_large' });
    let body;
    try { body = JSON.parse(raw); } catch { return json(400, { error: 'bad_json' }); }
    const items = Array.isArray(body?.items) ? body.items : null;
    const device = typeof body?.device === 'string' && /^[a-z0-9-]{8,64}$/i.test(body.device) ? body.device : null;
    if (!items || !items.length || items.length > LIMITS.batch || !device) return json(400, { error: 'bad_batch' });

    const ip = req.headers.get('CF-Connecting-IP') || '0.0.0.0';
    if (env.ALLOW_NO_TURNSTILE !== 'true') {
      if (!env.TURNSTILE_SECRET) return json(500, { error: 'turnstile_not_configured' });
      if (!await turnstileOk(env.TURNSTILE_SECRET, body.token, ip)) return json(403, { error: 'human_check_failed' });
    }

    const now = new Date(), iso = now.toISOString();
    const ipHash = await sha256((env.IP_SALT || 'sambad-demo') + ip);
    const tenMin = new Date(now - 10 * 60e3).toISOString(), day = new Date(now - 24 * 3600e3).toISOString();
    const use = await env.DB.prepare(
      `SELECT TOTAL(received_at > ?2) AS ip10, COUNT(*) AS ipday FROM feedback WHERE ip_hash = ?1 AND received_at > ?3`).bind(ipHash, tenMin, day).first();
    const n = items.length;
    if (use.ip10 + n > LIMITS.perIp10m) return json(429, { error: 'rate_limited', retry_after: 600 }, { 'Retry-After': '600' });
    if (use.ipday + n > LIMITS.perIpDay) return json(429, { error: 'daily_limit', retry_after: 3600 }, { 'Retry-After': '3600' });

    const accepted = [], dropped = [], rows = [];
    for (const it of items) {
      const id = typeof it?.id === 'string' && /^[a-z0-9-]{8,64}$/i.test(it.id) ? it.id : null;
      if (!id) { dropped.push({ id: String(it?.id ?? ''), reason: 'bad_id' }); continue; }
      const visitor = typeof it.visitor === 'string' && /^[a-z0-9-]{8,64}$/i.test(it.visitor) ? it.visitor : device;
      // Bot traps: the hidden field is filled, or the form was sent faster than a person can.
      // Reported as accepted so a bot learns nothing, but never stored.
      if (it.website || (typeof it.elapsed_ms === 'number' && it.elapsed_ms < LIMITS.minFillMs)) { accepted.push(id); continue; }
      const v = validate(it);
      if (v.error) { dropped.push({ id, reason: v.error }); continue; }
      const mine = await env.DB.prepare('SELECT COUNT(*) AS n FROM feedback WHERE visitor = ?1 AND received_at > ?2').bind(visitor, day).first();
      if (mine.n + rows.filter(r => r.visitor === visitor).length >= LIMITS.perVisitorDay) { dropped.push({ id, reason: 'visitor_limit' }); continue; }
      // The same words twice from one person is a duplicate. Across people on one IP (an event
      // laptop, an office), only long messages count, so two visitors can both say "Love it".
      const msgHash = v.row.message ? await sha256(v.row.message.toLowerCase().replace(/\s+/g, ' ')) : null;
      if (msgHash) {
        const wide = v.row.message.length > LIMITS.ipDedupeChars;
        const dup = await env.DB.prepare('SELECT 1 FROM feedback WHERE msg_hash = ?1 AND (visitor = ?2 OR (?3 AND ip_hash = ?4)) AND received_at > ?5 LIMIT 1')
          .bind(msgHash, visitor, wide ? 1 : 0, ipHash, day).first();
        if (dup || rows.some(r => r.msgHash === msgHash && (r.visitor === visitor || wide))) { dropped.push({ id, reason: 'duplicate' }); continue; }
      }
      rows.push({ ...v.row, id, visitor, msgHash });
      accepted.push(id);
    }
    if (rows.length) {
      await env.DB.batch(rows.map(r => env.DB.prepare(
        `INSERT OR IGNORE INTO feedback (id, received_at, created_at, device, visitor, ip_hash, kind, rating, topics, message, screen, route, target, role, company_size, contact, demo_role, msg_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`)
        .bind(r.id, iso, r.created_at, device, r.visitor, ipHash, r.kind, r.rating, r.topics, r.message, r.screen, r.route, r.target, r.role, r.company_size, r.contact, r.demo_role, r.msgHash)));
    }
    return json(200, { ok: true, accepted, dropped });
  },
};

// Checks one entry. Over-long fields are rejected rather than cut, since the page already enforces the limits.
export function validate(it) {
  if (!KINDS.includes(it.kind)) return { error: 'bad_kind' };
  const row = { kind: it.kind };
  for (const [k, max] of Object.entries(MAX)) {
    const s = it[k] == null ? '' : String(it[k]).trim();
    if (s.length > max) return { error: 'too_long_' + k };
    row[k] = s || null;
  }
  const rating = it.rating == null || it.rating === '' ? null : Number(it.rating);
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) return { error: 'bad_rating' };
  row.rating = rating;
  const topics = Array.isArray(it.topics) ? [...new Set(it.topics)] : [];
  if (topics.length > TOPICS.length || topics.some(t => !TOPICS.includes(t))) return { error: 'bad_topics' };
  row.topics = topics.join(',') || null;
  const created = it.created_at && !Number.isNaN(Date.parse(it.created_at)) ? new Date(it.created_at).toISOString() : null;
  row.created_at = created;
  if (it.kind === 'feedback' && !row.message && rating === null && !topics.length) return { error: 'empty' };
  if ((it.kind === 'vote' || it.kind === 'price') && !row.target) return { error: 'missing_target' };
  if (it.kind === 'question' && !row.message) return { error: 'empty' };
  return { row };
}

async function turnstileOk(secret, token, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    return (await r.json()).success === true;
  } catch { return false; }
}

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Read everything back: curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://<worker>/feedback?format=csv"
async function list(req, env, url) {
  const auth = req.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || !await sameSecret(auth, 'Bearer ' + env.ADMIN_TOKEN)) return new Response('Unauthorized', { status: 401 });
  const since = url.searchParams.get('since') || '1970-01-01';
  const { results } = await env.DB.prepare(`SELECT ${COLS.join(', ')} FROM feedback WHERE received_at > ?1 ORDER BY received_at DESC LIMIT 5000`).bind(since).all();
  if (url.searchParams.get('format') === 'csv') {
    const q = v => v == null ? '' : `"${String(v).replace(/"/g, '""')}"`;
    const csv = [COLS.join(','), ...results.map(r => COLS.map(c => q(r[c])).join(','))].join('\n');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="sambad-feedback.csv"' } });
  }
  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
}

// Compares hashes so the check takes the same time whether or not the token is close.
async function sameSecret(a, b) { return (await sha256(a)) === (await sha256(b)); }

/*
 * Self-check for the feedback Worker, no Cloudflare account needed.
 * Runs the real fetch handler against an in-memory SQLite database that
 * mimics the small part of the D1 API the Worker uses, then checks the
 * rules that matter: origin, Turnstile, validation, bot traps, duplicates,
 * rate limits and the admin read-back. Run: node test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker, { LIMITS } from './src/index.js';

const sql = new DatabaseSync(':memory:');
sql.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
const stmt = (q, args = []) => ({
  bind: (...a) => stmt(q, a),
  first: async () => sql.prepare(q).get(...args) ?? null,
  all: async () => ({ results: sql.prepare(q).all(...args) }),
  run: async () => sql.prepare(q).run(...args),
});
const DB = { prepare: q => stmt(q), batch: async list => Promise.all(list.map(s => s.run())) };
const ORIGIN = 'https://demo.example';
const env = { DB, ALLOWED_ORIGINS: ORIGIN, ALLOW_NO_TURNSTILE: 'true', ADMIN_TOKEN: 'owner-secret', IP_SALT: 'salt' };

let seq = 0;
const item = (extra = {}) => ({ id: 'id-test-' + String(++seq).padStart(4, '0'), kind: 'feedback', rating: 4, topics: ['idea'], message: 'Message ' + seq, elapsed_ms: 5000, ...extra });
const post = (items, { origin = ORIGIN, ip = '1.1.1.1', device = 'device-aaaa1111', e = env, token } = {}) =>
  worker.fetch(new Request('https://w.example/feedback', { method: 'POST', headers: { Origin: origin, 'CF-Connecting-IP': ip, 'Content-Type': 'application/json' }, body: JSON.stringify({ items, device, token }) }), e);
const count = () => sql.prepare('SELECT COUNT(*) AS n FROM feedback').get().n;

// Happy path, and CORS header for the allowed origin.
let r = await post([item()]);
assert.equal(r.status, 200);
assert.equal(r.headers.get('Access-Control-Allow-Origin'), ORIGIN);
assert.equal((await r.json()).accepted.length, 1);
assert.equal(count(), 1);

// Same id again is idempotent (a retried send after a dropped response).
const again = item();
await post([again]); await post([again]);
assert.equal(count(), 2);

// Wrong origin, bad JSON, empty and oversized batches are refused.
assert.equal((await post([item()], { origin: 'https://evil.example' })).status, 403);
assert.equal((await worker.fetch(new Request('https://w.example/feedback', { method: 'POST', headers: { Origin: ORIGIN }, body: '{nope' }), env)).status, 400);
assert.equal((await post([])).status, 400);
assert.equal((await post(Array.from({ length: LIMITS.batch + 1 }, () => item()))).status, 400);

// Validation: bad rating, unknown topic, over-long message, empty feedback.
r = await (await post([item({ rating: 9 }), item({ topics: ['spam'] }), item({ message: 'x'.repeat(2001) }), item({ rating: null, topics: [], message: '' })])).json();
assert.deepEqual(r.dropped.map(d => d.reason), ['bad_rating', 'bad_topics', 'too_long_message', 'empty']);

// Bot traps: reported as accepted, never stored.
const before = count();
r = await (await post([item({ website: 'http://spam' }), item({ elapsed_ms: 200 })])).json();
assert.equal(r.accepted.length, 2);
assert.equal(count(), before);

// Duplicates from the same device are dropped, inside a batch and across batches.
r = await (await post([item({ message: 'Same words' }), item({ message: 'same   WORDS' })])).json();
assert.deepEqual(r.dropped.map(d => d.reason), ['duplicate']);
r = await (await post([item({ message: 'Same words' })])).json();
assert.deepEqual(r.dropped.map(d => d.reason), ['duplicate']);

// Per-IP rate limit over 10 minutes.
for (let i = 0; i < 4; i++) await post(Array.from({ length: 10 }, () => item()), { ip: '2.2.2.2', device: 'device-bbbb' + i + '000' });
r = await post([item()], { ip: '2.2.2.2', device: 'device-cccc0000' });
assert.equal(r.status, 429);

// Turnstile is required unless explicitly disabled.
const strict = { ...env, ALLOW_NO_TURNSTILE: undefined, TURNSTILE_SECRET: 's' };
const realFetch = globalThis.fetch;
globalThis.fetch = async () => new Response(JSON.stringify({ success: false }));
assert.equal((await post([item()], { e: strict, token: 'bad' })).status, 403);
globalThis.fetch = async () => new Response(JSON.stringify({ success: true }));
assert.equal((await post([item()], { e: strict, token: 'good', ip: '3.3.3.3', device: 'device-dddd0000' })).status, 200);
globalThis.fetch = realFetch;

// Admin read-back needs the bearer token; raw IP hashes are not returned.
const get = (auth, q = '') => worker.fetch(new Request('https://w.example/feedback' + q, { headers: auth ? { Authorization: auth } : {} }), env);
assert.equal((await get()).status, 401);
assert.equal((await get('Bearer wrong')).status, 401);
const rows = await (await get('Bearer owner-secret')).json();
assert.equal(rows.length, count());
assert.ok(!('ip_hash' in rows[0]));
const csv = await (await get('Bearer owner-secret', '?format=csv')).text();
assert.ok(csv.startsWith('id,received_at'));

console.log(`feedback worker: all checks passed (${count()} rows stored)`);

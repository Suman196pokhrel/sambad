# Demo feedback collector

The clickable mock sends visitor feedback here. This folder holds a small
Cloudflare Worker that stores it in a D1 database (SQLite) on your
Cloudflare account. Nobody else can read it.

## How feedback moves

1. A visitor uses **Give feedback** in the mock. The entry is saved on
   their device first (`localStorage`, key `sambad-feedback-v1`), so
   nothing is lost if the venue Wi-Fi drops. Entries the team hasn't
   received are never trimmed.
2. When the page is online and an endpoint is configured, it sends queued
   entries in batches of up to 10, with a Turnstile token proving a person
   is at the page.
3. The Worker checks everything again and stores what passes. Entries the
   Worker accepts or rejects leave the queue. Rate-limited or failed sends
   stay queued and retry later.
4. With no endpoint configured, entries stay on the device. The presenter
   exports them from **Demo > Feedback on this device** as CSV or JSON.

## Spam protection

| Layer | Where | What it stops |
|---|---|---|
| Hidden trap field, minimum time to fill | Page and Worker | Form-filling bots |
| Length limits | Page and Worker | Oversized pastes |
| The same note twice from one visitor is dropped. Long notes are also dropped when repeated from one IP. | Page and Worker | Copy-paste floods |
| 10 second cooldown, 40 entries per visitor per day | Page and Worker | A visitor mashing Send |
| Cloudflare Turnstile token, verified server side | Worker | Scripts posting directly to the endpoint |
| 60 entries per IP per 10 minutes, 600 per IP per day | Worker | Anyone who gets past Turnstile |
| Origin allowlist | Worker | Other websites posting from a visitor's browser |

Page-side checks are for honest visitors. Only the Worker's checks are
trusted.

**One laptop, many visitors.** At an event, everyone shares one browser
and one IP. "Start fresh for the next person" gives each person a new
visitor id, so per-person limits and duplicate checks don't block the
next visitor. That's also why the IP limits are generous, and why two
people can both send "Love it".

**Price picks.** A visitor who changes their pick creates a new row. To
count each visitor's final pick only:
`SELECT message, COUNT(*) FROM (SELECT visitor, message, MAX(received_at) FROM feedback WHERE kind = 'price' GROUP BY visitor) GROUP BY message`

Raw IP addresses are never stored, only a salted SHA-256 hash.

## Set it up (about 10 minutes)

You need a free Cloudflare account and Node.js.

```bash
cd docs/mock-wireframes/feedback-worker
npx wrangler login
npx wrangler d1 create sambad-feedback          # copy the database_id into wrangler.toml
npx wrangler d1 execute sambad-feedback --remote --file=schema.sql
```

**Turnstile:**
1. In the Cloudflare dashboard, open Turnstile and add a widget. Use the
   Managed mode, and add the hostname you serve the mock from (for
   example `suman196pokhrel.github.io`).
2. Copy the **site key**. It goes in `../config.js`.
3. Copy the **secret key**. It goes to the Worker as a secret, below.

Then set the secrets and deploy:

```bash
npx wrangler secret put TURNSTILE_SECRET   # the Turnstile secret key
npx wrangler secret put ADMIN_TOKEN        # any long random string, for reading feedback
npx wrangler secret put IP_SALT            # any long random string
npx wrangler deploy                        # prints https://sambad-feedback.<you>.workers.dev
```

Finally, open `../config.js` and set:
- `endpoint` to `https://sambad-feedback.<you>.workers.dev/feedback`
- `turnstileSiteKey` to the site key from step 2 above

Also check that `ALLOWED_ORIGINS` in `wrangler.toml` lists every origin
you serve the mock from.

## Read the feedback

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://sambad-feedback.<you>.workers.dev/feedback?format=csv" > feedback.csv
# or query it directly
npx wrangler d1 execute sambad-feedback --remote --command "SELECT received_at, kind, rating, topics, message, screen FROM feedback ORDER BY received_at DESC LIMIT 50"
```

## Test without Cloudflare

```bash
node test.mjs
```

This runs the real handler against an in-memory SQLite database and
checks the origin, Turnstile, validation, bot-trap, duplicate, visitor,
rate-limit and read-back rules. It was also run end to end: the mock
served over HTTP, this Worker under Node, and Cloudflare's public
Turnstile test keys. A real D1 database and real site keys have not been
tested yet; the first deploy is that test.

## Things to know

- **Opening the mock from disk won't send.** Turnstile only works on the
  hostnames you register, so a mock opened with `file://` keeps
  everything on the device. At events, use the hosted URL, or serve the
  folder locally (`python3 -m http.server 8000`) and add `localhost` to
  the Turnstile widget.
- **Visitors can see the endpoint URL.** It's public by design, which is
  why the Worker never trusts the page.

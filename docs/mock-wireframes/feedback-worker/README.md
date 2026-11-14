# Demo hosting and feedback collector

This folder deploys the clickable mock to Cloudflare as one Worker:

- **The demo.** Cloudflare serves the files in the folder above (`index.html`,
  `app.js` and the rest) as a static site. Those requests are free and
  never run this code.
- **Feedback.** Requests to `/feedback` run `src/index.js`, which checks
  each entry and stores it in a D1 database (Cloudflare's hosted SQLite)
  on your account. Nobody else can read it.

The demo and the feedback endpoint share one URL, so `config.js` uses the
relative path `/feedback`.

## How feedback moves

1. A visitor uses **Give feedback** in the mock. The entry is saved on
   their device first (`localStorage`, key `sambad-feedback-v1`), so
   nothing is lost if the venue Wi-Fi drops. Entries the team hasn't
   received are never trimmed.
2. When the page is served from a website and is online, it sends queued
   entries in batches of up to 10, with a Turnstile token proving a person
   is at the page.
3. The Worker checks everything again and stores what passes. Entries the
   Worker accepts or rejects leave the queue. Rate-limited or failed sends
   stay queued and retry later.
4. When the demo is opened from disk, entries stay on the device. The presenter
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

## Set it up (about 15 minutes)

You need a free Cloudflare account and Node.js.

**Turnstile (dashboard):**
1. Open Turnstile and add a widget in Managed mode. Add the hostname
   `workers.dev` and, for local testing, `localhost`.
2. The **site key** is public. It goes in `../config.js` as
   `turnstileSiteKey`.
3. The **secret key** is set on the Worker below. Never commit it.

**Database and deploy (terminal):**

```bash
cd docs/mock-wireframes/feedback-worker
npx wrangler login
npx wrangler d1 create sambad-feedback          # copy the database_id into wrangler.toml
npx wrangler d1 execute sambad-feedback --remote --file=schema.sql
npx wrangler deploy                             # prints https://sambad-demo.<you>.workers.dev
npx wrangler secret put TURNSTILE_SECRET        # paste the Turnstile secret key when asked
openssl rand -hex 32 | npx wrangler secret put IP_SALT
openssl rand -hex 32 | tee ~/.sambad-feedback-token | npx wrangler secret put ADMIN_TOKEN
chmod 600 ~/.sambad-feedback-token              # your token for reading feedback
```

Until the secrets are set, `/feedback` answers with an error and the
demo keeps entries queued on the device, so nothing is lost.

To serve the demo somewhere else as well, add that site's origin to
`ALLOWED_ORIGINS` in `wrangler.toml`.

## Read the feedback

- **Dashboard:** open Storage & Databases, then D1, then
  `sambad-feedback`. You can browse the table or run SQL in the console.
- **Terminal:**

```bash
curl -H "Authorization: Bearer $(cat ~/.sambad-feedback-token)" "https://sambad-demo.<you>.workers.dev/feedback?format=csv" > feedback.csv
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

- **Opening the mock from disk won't send.** A copy opened with `file://`
  keeps everything on the device.
- **At events, open the hosted URL while you have internet, and keep the
  tab open.** If the Wi-Fi drops, feedback queues on the laptop and is
  sent once it reconnects. With no internet at all, the hosted page can't
  load, so open the copy from disk and export the feedback afterwards.
- **Turnstile hostnames.** If the human check fails on the live site,
  add the exact hostname (`sambad-demo.<you>.workers.dev`) to the
  Turnstile widget.
- **Visitors can see the endpoint URL.** It's public by design, which is
  why the Worker never trusts the page.

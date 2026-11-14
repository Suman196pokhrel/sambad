# Sambad specification

**Status:** living document, last revised 2026-11-15.
**Owner:** Suman Pokhrel. Only the owner changes decisions recorded here.

This is the single source of truth for what Sambad is, who it is for, what
gets built and in what order, and how. It is written so a person or an LLM
can work on the project without guessing.

---

## 0. How to use this document

**Read it first.** Read this file before working on Sambad. Read the
section that covers your task again before you change anything.

**Keywords.** **MUST**, **MUST NOT**, **SHOULD** and **MAY** mean what
they mean in RFC 2119. A MUST rule is never traded away for convenience,
speed or a cleverer design.

**When sources disagree:**

1. The owner's latest explicit instruction wins.
2. Then this spec, for what the product is and should become.
3. Then `CLAUDE.md`, for working rules in the repository: commands,
   commit style, files that need permission. Section 11 repeats them.
4. The code describes what exists today, not what is intended. If the
   code and this spec disagree, the code is not automatically wrong,
   and neither is the spec. Point out the mismatch and ask.

**Open questions are not yours to settle.** Section 12 lists decisions
that have not been made. An LLM MUST NOT settle them by implementing
one option. Ask the owner, or build only what does not depend on the
answer.

**Don't add scope.** An LLM MUST NOT add features, screens,
dependencies or abstractions that this spec does not describe, unless
the owner asks for them in the current task.

**Keep this file current.** When a decision is made, or something
listed as "not built" gets built, update this file in the same change.

---

## 1. Product in one page

**Name.** Sambad, Nepali for "dialogue".

**One line.** Ask your documents anything, and know where the answer came
from.

**What it is.** A self-hosted, privacy-first knowledge assistant for
organisations. Employees ask questions in plain language and get answers
drawn only from their company's own documents (Confluence, Google Drive,
Notion, SharePoint and uploaded files). Every claim links to its source.

**Three things it does that most assistants don't:**

1. **Permission-aware.** A person only ever gets answers built from
   pieces of documents they can already open in the source system.
   Filtering happens inside the search query, down to individual pieces
   of a document. Hidden content is never mentioned to the person asking.
2. **Fresh and honest.** Every source shows how recently it changed.
   Old sources are flagged in plain words. When the documents don't cover
   a question, Sambad says so ("This isn't covered"). It does not guess.
   Partly answered questions say exactly which part is missing.
3. **Accountable.** Admins can prove what happened. An access audit
   records every question, which pieces were used and which were
   withheld, and the rule that withheld them. An access inspector shows
   what any one person can see. A knowledge-gaps view clusters the
   questions the documents couldn't answer.

**How it runs.** Entirely on the customer's own infrastructure
(`docker compose up`). The language model is the customer's choice: local
(Ollama or vLLM) or a private hosted endpoint. Nothing is sent to the
Sambad project, ever.

**Status.** Pre-MVP. The clickable demo is complete and is being shown to
potential users for feedback. The real backend has its foundations only
(section 7).

---

## 2. Problem and positioning

### 2.1 Problems Sambad solves

- **Leaks through AI search.** Generic assistants and naive RAG
  (retrieval-augmented generation) systems index everything, then filter
  results after retrieval, or not at all. Restricted content shows up in
  answers or quietly shapes them.
- **Outdated answers.** Search returns a two-year-old policy with the same
  confidence as last week's. Nobody can tell which is current.
- **Confident guessing.** Assistants fill gaps with plausible text instead
  of admitting the documents don't cover the question.
- **No proof for security reviews.** Security and compliance teams can't
  see what the assistant showed to whom, or why.
- **Data can't leave the building.** Regulated and privacy-sensitive
  organisations can't send documents or questions to a third-party cloud.

### 2.2 Market context (November 2026, verify before quoting)

- **Glean** is the commercial enterprise-search leader. It is cloud
  first.
- **Onyx** (formerly Danswer) is open source and self-hostable. It
  positions itself as the open-source alternative to Glean. Reports
  conflict on whether its permission sync is free or Enterprise-only.
  Its cloud plan has been reported at around $20 to $25 per user per
  month.

The idea is not unique. Sambad competes on execution. The wedge to test
with users is three things shipped together, in the free tier:
permissions enforced inside the query, freshness, and honest "not
covered" answers backed by an access audit.

---

## 3. Who it is for

### 3.1 People who use it

| Persona | Demo stand-in | What they need |
|---|---|---|
| Employee | Priya Mehta, `priya@acme.com` | Fast, trustworthy answers with sources. A person to ask when the documents run out. |
| Workspace admin | Suman Pokhrel, `suman@acme.com` | Connect sources, keep the index current, fix failing syncs, see what can't be answered. |
| Security or compliance reviewer | Lena Martin, auditor | Evidence of who saw what, and why some content was withheld. Read-only. |
| Knowledge manager | Tom Baker | Find stale documents and missing topics, and get owners to fix them. |
| IT | | Single sign-on, provisioning, deployment, upgrades and backups that don't create on-call pain. |

### 3.2 Who buys it (working hypothesis, being tested)

The likely buyer is the IT, security or knowledge-operations lead at an
organisation of about 50 to 1,000 people that has these traits:

- Its documents are spread across Confluence, Drive, Notion and
  SharePoint.
- It has real permission boundaries: HR, finance, legal, contractors.
- It is cautious about sending data to a third-party AI. Regulated
  sectors (finance, health, legal, government) are the strongest fit.

This is not validated yet. Event and interview feedback (section 8.6)
exists to test it.

---

## 4. Product principles (non-negotiable)

These rules apply to every feature, screen, API and line of code. An LLM
MUST treat a conflict with any of them as a blocker and raise it.

### 4.1 Permissions

- **P1. Denied content is invisible.** The employee interface MUST NOT
  reveal that anything was hidden. That rules out "3 results were
  hidden", greyed-out sources, counts that include restricted
  documents, and hints that something restricted exists. Denials are
  recorded in the admin access audit and nowhere else.
- **P2. Filter inside the query.** Permission filtering MUST happen
  inside the retrieval query. Search MUST NOT fetch candidates first and
  filter them afterwards. Post-filtering degrades relevance and is how
  leaks happen.
- **P3. Never widen access.** A person sees at most what they can open
  in the source system. Permissions are mirrored from the source at each
  sync. Access removed in the source MUST be removed in Sambad by the
  next sync.
- **P4. Piece-level access.** Access is evaluated per piece of a
  document, not only per document. Allow and deny rules, nested groups
  and contractor-style deny groups are all supported. Nested groups are
  expanded when a question is asked.
- **P5. Read-only to sources.** Sambad reads documents and their
  permissions. It MUST NOT write anything back to a source system.

### 4.2 Honest answers

- **P6. Every claim cites its source.** Answer sentences carry numbered
  citations linked to the exact passage. Optional strict mode (section
  5.2) drops any sentence without a source.
- **P7. "Not covered" beats a guess.** If the documents don't support an
  answer above the confidence threshold, Sambad MUST say "This isn't
  covered in your documents", show the closest source if there is one,
  and offer a person to ask. It MUST NOT invent an answer. The phrasing
  places the gap in the documents, not in the person asking.
- **P8. Partial means partial.** When only part of a question is
  supported, answer that part, and say plainly which part isn't covered.
  Each missing part gets its own route to a person.
- **P9. There is always a person.** Every unanswered or partly answered
  question offers someone to ask, routed by topic.

### 4.3 Freshness

- **P10. Freshness is a sentence, not a score.** Show it as "Updated 3
  days ago", or "hasn't been updated in 14 months, worth
  double-checking". The warning belongs to the source, not to the
  answer: the content may still be right, it just hasn't been checked
  recently.
- **P11. Admins can vouch.** An admin can mark an old document "still
  accurate". That suppresses the staleness warning for 6 months.

### 4.4 Privacy and deployment

- **P12. Self-hosted, no phone-home.** All data stays on infrastructure
  the customer runs. No telemetry, analytics or crash reports go to the
  project.
- **P13. The model is the customer's choice.** Local and hosted models
  are equal options in the settings. Before switching to a hosted
  endpoint, the admin MUST be told that questions and the passages used
  to answer them will be sent there. Permission filtering always
  happens locally first.
- **P14. Storage of documents:**
  - Uploaded files are stored once in object storage (MinIO, which
    speaks S3), addressed by content hash. Sambad is the only copy.
  - Documents from a connector are parsed and then discarded, never
    copied into storage. The source system remains the source of truth.
- **P15. Secrets.** Credentials never appear in logs, the audit trail or
  git.

### 4.5 Language and interaction

- **P16. Speak in users' terms.** Employee screens never say retrieval,
  embedding, rerank, vector, chunk, token or abstain. Use "pieces of
  documents", "not covered", "reading the most relevant passages".
  Admin screens may be more technical, but plain words still come
  first.
- **P17. Show the work honestly.** While answering, show truthful stages
  in plain words: searching which sources, how many possible matches,
  reading the most relevant passages, writing the answer. Each stage
  shows something you can see. A Stop button is always available.
- **P18. The ask box is just a box.** One input that behaves as people
  expect: Enter to send, Shift+Enter for a new line. No slash commands
  and no autocomplete inside it. A separate ⌘K or Ctrl+K palette for
  navigation is allowed.
- **P19. Mobile loses nothing.** Phones get the same citations and
  sources. The sidebar collapses behind a menu and panels become
  full-screen.

---

## 5. Scope

There are three tiers. An LLM MUST check which tier a feature is in
before building it, and MUST NOT build tier 5.2 or 5.3 work during MVP
tasks.

### 5.1 MVP (first real release)

The MVP is the clickable demo's core flows, built for real, with **one
connector** (Confluence, per wireframe v1) plus uploaded files.

**Sign-in and accounts:**
- **Primary: "Continue with your work account".** Single sign-on
  through the company's identity provider: Okta, Entra ID or Google
  Workspace.
- **Alternative: email and password.** Includes these flows:
  - creating a workspace, for the person setting Sambad up
  - email verification with a 6-digit code (10-minute expiry, resend
    after 30 seconds)
  - forgot password with a reset code. It responds the same way
    whether or not the account exists, so the form can't reveal which
    emails have accounts.
  - setting a new password: 8 or more characters, a number, and upper
    and lower case
  - accepting an invite
- The original wireframe said SSO only. The owner decided on SSO
  primary with email and password as the alternative. Section 12 notes
  this.
- **Roles in the MVP:** employee and admin.

**Employee app:**
- **First run.** A greeting, the ask box, and example questions grouped
  by topic.
- **No sources connected yet.** A clear empty state with "Message your
  admin". The ask box is disabled.
- **Asking.** Narrated working stages (P17) with source tiles that
  appear as they're found. Used sources get numbers; the rest fade.
  Stop is always available.
- **Answer.**
  - Serif prose with numbered citations.
  - Hovering a citation highlights the claim it supports and shows a
    preview of the source.
  - Clicking a citation opens a drawer: the passage in context, the
    source's freshness, who last changed it, and "Open in <source>".
- **Freshness.** A warning line appears when a cited source is stale.
- **Not covered (P7):** the closest source, "Ask <person>", and "Flag
  as missing".
- **Partial answer (P8):** a coverage bar showing which parts were
  covered, and actions on each missing part.
- **Follow-ups.** Earlier turns fold up. Sources are re-stated for each
  answer, not pooled.
- **History.** Grouped by Today, Earlier this week and Older, and
  searchable.
- **Answer feedback.** Thumbs up, or "Not helpful". "Not helpful" asks
  one question with three reasons ("It's out of date", "It's not what I
  asked", "It's just wrong") plus an optional note. The admin sees the
  result.
- **Service down.** "Sambad can't answer right now", the question is
  saved, and a "Try again" button.
- **Search scope.** Limit a question to particular sources.
- **Mobile layout (P19).**

**Admin console:**
- **Overview.**
  - A narrative headline that names what needs attention, with links.
  - Metrics: documents indexed, questions asked, percent answered, and
    stale documents still being cited.
  - Charts: answered against not covered over time, and where the
    documents live.
  - "Most asked, least answered" and "Needs attention" lists.
- **Sync and freshness.**
  - Connector health, with a history of recent sync attempts.
  - A chart of document age against how often each is cited, with the
    old-and-heavily-used corner highlighted as "fix first".
  - A table of stale documents that are still cited.
  - "Re-index everything". Unchanged content is skipped by content
    hash.
- **Document detail.**
  - Last changed, citations and number of pieces.
  - "Mark as still accurate" (P11) and "Ask the owner to update it".
  - A piece map: each piece's citation count and whether it is
    restricted.
  - Access layers: which rule covers which pieces.
  - Re-index this document.
- **Sync run detail.** How many documents were unchanged, re-indexed,
  skipped or failed. Each failure shows its reason, with Retry and
  Skip. Skip can be undone.
- **Access audit.**
  - Every question, with the pieces used and the pieces withheld, and
    the rule that withheld each one ("Deny rule" or "No allow rule").
  - Filter by person and by time range.
  - Export as CSV.
- **Access inspector.**
  - Pick a person to see their groups (direct, inherited and deny),
    plus how much they can see fully, partly or not at all.
  - Check a specific document.
  - List documents they can see only partly, and why.
- **Knowledge gaps.**
  - Unanswered and flagged questions, clustered by topic and sorted by
    how often they're asked.
  - A trend for each topic.
  - Actions: "Mark as written", Assign to an owner, and "Not a gap".
    "Not a gap" sends the question to search-quality review: the
    content exists and search missed it.
- **Connectors.**
  - Each connector's status, sync frequency and the pause switch.
  - "Sync now", Reconnect when access has expired, and Disconnect
    (with a confirmation and an Undo).
- **Add a source.** Four steps: choose one or more sources, connect each (or upload),
  choose spaces and how often to check for each source, then review together. The permissions
  promise is stated plainly on the final step.
- **People and groups.** A read-only mirror of the identity provider,
  including nested groups, with a re-sync button.
- **Model.**
  - Choose where answers are generated: on this server, or a hosted
    endpoint (with the P13 warning).
  - Choose the answering model and the search model. Changing the search
    model warns that everything will be re-indexed.
  - Set the confidence threshold on a histogram of last week's
    questions, which shows how many would change.
  - Test the connection.

**Platform:**
- Docker Compose deployment (section 6.4).
- Migrations from the first table.
- Idempotent ingestion jobs.
- Reconciliation between Postgres and the job queue.

### 5.2 After MVP (planned, shown in the demo)

These items appear in the demo's Workspace settings so visitors can react
to them. "Working in the demo" means the screen behaves fully but
nothing real happens behind it. "Planned" means it has a description and
an "I'd need this" vote button, nothing more.

| Feature | In the demo |
|---|---|
| Require SSO (turn off passwords except for the owner) | Working |
| Automatic user provisioning (SCIM) | Working |
| Session timeout: 8 hours, 24 hours or 7 days | Working |
| Allowed email domains for password sign-up | Working |
| Admin roles: Owner, Admin, Auditor (read-only access audit and inspector), Knowledge manager (gaps and freshness) | Working |
| Rename the assistant (white-label, for example "Ask Acme") | Working |
| Strict mode: only sentences with a source | Working |
| Route uncovered questions by topic to People Ops, IT, Finance or Security | Working |
| Retention for questions and answers (30 days, 90 days, 1 year or forever) and for the audit (1, 3 or 7 years) | Working |
| Mask personal details in logs and analytics | Working |
| Hide who asked in analytics; auditors still see names | Working |
| Export all workspace data; delete the workspace after 7 days | Working |
| API keys that act within the user's own permissions | Working |
| More connectors: Google Drive, Notion, SharePoint | Working |
| Ask from Slack | Planned |
| Ask from Microsoft Teams | Planned |
| Stream the audit log to a SIEM (Splunk, Sentinel, Elastic) | Planned |
| Answers in more languages | Planned |
| Browser extension | Planned |
| Build-your-own-connector API | Planned |

### 5.3 Final product vision

- **An organisation's trusted answer layer.** Every internal question
  goes to Sambad first, in the web app, Slack, Teams or the browser. It
  answers with sources, or routes the question to the right person.
- **A knowledge loop.** Questions that can't be answered become
  assigned writing tasks. Stale documents that are heavily cited
  become review tasks. The gap closes, and Sambad watches whether
  people stop asking.
- **Audit-grade evidence.** Security teams treat the access audit as
  evidence, and stream it to their SIEM.
- **Runs anywhere.** One laptop for evaluation, a single VM, an
  air-gapped data centre or private cloud. Model choice is per
  deployment.
- **An open core.** The source is visible and free for non-commercial
  use. Companies pay for a commercial licence, enterprise features and
  support (section 10).

### 5.4 Non-goals (things Sambad will not do)

- Write to, edit or reorganise documents in source systems.
- Widen anyone's access, even when an admin asks for it. Change the
  permissions in the source system instead.
- Act as a general chatbot that answers from the model's own knowledge.
- Send telemetry or customer data to the Sambad project.
- Tell an employee that hidden content exists (P1).
- Show a bare relevance or confidence score to employees.

---

## 6. Architecture (intended)

This section describes what the codebase is meant to grow into. Section
7 says what exists today.

### 6.1 Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, TypeScript, Vite. Routing, styling and component conventions are not decided (section 12). |
| Backend | Python 3.11 or later, FastAPI, Pydantic settings, async SQLAlchemy 2 with psycopg 3 |
| Database | PostgreSQL 16 with pgvector |
| Jobs | Celery, with Redis as the broker |
| Object storage | MinIO (S3-compatible) through boto3 |
| Proxy and TLS | Caddy: `/api/*` goes to the API, everything else to the frontend |
| Models | Pluggable. Ollama or vLLM locally, or a private OpenAI-compatible endpoint. |
| Deploy | Docker Compose: a base file for production and a dev overlay |
| Python tooling | `uv` only, never `pip` |

### 6.2 Backend layout (`backend/src/sambad/`)

```
main.py              FastAPI entrypoint (lifespan checks, mounts routers under /api)
worker.py            Celery entrypoint
cli.py               Developer commands: ingest, reindex, seed, eval

models/              SQLAlchemy tables
schemas/             Pydantic request and response contracts
api/                 HTTP routers. Thin: validate, call core, return.

core/                All business logic. Imports no web framework and no task queue.
├── config.py        Settings (lives here today; the README tree shows it at top level)
├── db.py            Engine and session factory (same note)
├── ingestion/       Parse, chunk, embed
├── retrieval/       Search, permission filter, rerank
├── generation/      Prompts, agentic loop, abstain
├── permissions/     Group expansion, rule evaluation
└── freshness/       Content hashing, staleness, reconciliation

connectors/          Document sources: a base class plus one class per source
llm/                 Model providers: a base class, Ollama, and API
storage/             Object storage client (MinIO through S3)
tasks/               Celery tasks: thin wrappers over core
```

**Why `core/` is separate.** The API, the CLI and the workers are three
thin callers of the same logic. Permission evaluation can be tested
without starting a server, and ingestion without Redis running. Business
logic MUST NOT live in `api/` routers or `tasks/` wrappers.

**Plugin points.** `connectors/` and `llm/` are the only places with
base classes, because they will have several implementations. Adding a
source or a model provider means adding one class. Nowhere else gets an
abstraction layer without evidence it's needed.

### 6.3 How the core flows work

**Ingestion:**
1. A connector lists documents and their permissions.
2. Each document is parsed and split into pieces. Each piece is
   embedded and stored in pgvector, along with the access rules that
   apply to it.
3. Every job is keyed on a content hash and is safe to run twice.
   Unchanged content is skipped.
4. Redis only dispatches work; Postgres holds the truth. A lost message
   is recovered by reconciliation, not by trusting the queue.

**Asking a question:**
1. **Expand groups.** Resolve the asker's groups, including nested
   groups, at question time.
2. **Search within permissions.** The vector search query itself is
   limited to pieces the asker may see (P2).
3. **Rerank.** Order the results by relevance.
4. **Plan, then verify.** The model plans which passages answer which
   part of the question. A verification step checks that each claim is
   supported by its passage.
5. **Not covered or partial.** If confidence is below the threshold,
   abstain (P7). If only part of the question is supported, return a
   partial answer (P8).
6. **Audit.** Record the pieces used and the pieces withheld, with the
   rule that withheld each one.

**Freshness:**
- Track when each document last changed and how often it is cited.
- A document is stale after 12 months without changes. This is a
  default; the final value is open.
- "Mark as still accurate" suppresses the warning for 6 months.
- Sync history is kept for each connector.

**Data model:** not designed yet (`docs/SCHEMA.md` is empty). These
entities are implied by the demo and are **candidates, not decisions**:
- workspace, user, group, group membership (nested)
- source (connector), sync run, document, piece (chunk)
- access rule (allow or deny, scope)
- thread, turn, citation
- answer feedback, knowledge gap, audit event
- model settings, workspace settings

Every table MUST have `workspace_id` from the first migration.

### 6.4 Containers

| Service | Image | Notes |
|---|---|---|
| `db` | `pgvector/pgvector:pg16` | `docker/postgres/init.sql` enables the `vector` extension |
| `redis` | `redis:7-alpine` | Password set from `.env` |
| `minio` | `minio/minio` | Console on 9001 in the dev overlay |
| `api` | built from `backend/` | `uvicorn sambad.main:app` |
| `worker` | the same image as `api` | `celery -A sambad.worker.celery_app worker` |
| `frontend` | built from `frontend/` | Served behind Caddy |
| `caddy` | `caddy:2-alpine` | `docker/caddy/Caddyfile`, domain from `DOMAIN` |

The dev overlay adds:
- live reload for `api` and `worker`
- host ports for `db` (5432) and the MinIO console (9001)
- pgAdmin (5050) and a Redis UI (5540)

Startup order is enforced by health checks.

---

## 7. Current state (2026-11-15)

**Built:**
- **`main.py`.** At startup it checks Postgres (`SELECT 1`) and Redis
  (ping), and makes sure the MinIO bucket exists. It serves
  `GET /health` and mounts the auth router under `/api`.
- **`api/auth_router.py`.** `GET /api/auth/health`, and
  `POST /api/auth/login`, which is **mocked**. There is no users table:
  `core/auth.py` accepts only `demo@sambad.local` with `password123` and
  returns a fixed token.
- **`core/config.py`.** Pydantic settings: `database_url`, `redis_url`,
  the MinIO values and `secret_key`.
- **`core/db.py`.** An async engine and `get_session`.
- **`core/redis.py`.** An async Redis client.
- **`storage/client.py`.** A boto3 client and `ensure_bucket()`.
- **`worker.py`.** A Celery app with no tasks yet.
- **Infrastructure:** Docker Compose (base and dev overlay), the Caddy
  routing, the pgvector init script, and the Makefile targets `up`,
  `down`, `logs`, `ps` and `restart`.
- **Clickable demo:** complete. See section 8.

**Not built:**
- models, migrations (`alembic.ini` is empty), `cli.py` (empty)
- the `connectors/`, `llm/` and `tasks/` folders
- every `core/` subsystem
- tests, a linter or type-checker config for the backend
- `make migrate`, `make seed` and `make test` (named in the README, but
  not real yet)

**Frontend:** the stock Vite scaffold: React 19, Vite 8, TypeScript 6,
oxlint, pnpm.

**Docs:**
- `docs/decisions/`, `docs/stories/`, `docs/SCHEMA.md` and
  `docs/DEFERED.md` are empty.
- `docs/sambad-wireframes-full.html` is wireframe v1, the first
  statement of the MVP.

**Known inconsistencies to fix (ask before editing `CLAUDE.md`):**
- The "Current state" section of `CLAUDE.md` says every backend file is
  0 bytes. That is outdated.
- The README's Docs tree says `DEFERRED.md`, but the file on disk is
  `DEFERED.md`.
- The README tree puts `config.py` and `db.py` at the package top
  level, but they live in `core/`.

---

## 8. The clickable demo (`docs/mock-wireframes/`)

### 8.1 Purpose

The demo lets potential users try Sambad and give feedback before the
real product exists. Visitors try it at events, on a shared laptop, and
online through a hosted link. It is a prototype, not production code. Its
behaviour, copy and visuals are the reference the real frontend is built
to match.

### 8.2 Run it

Open `docs/mock-wireframes/index.html` in a browser. There is no build or
server, and the only network requests are for Google Fonts. To send
feedback to a server, serve the folder over HTTP (section 8.6).

### 8.3 Files

| File | Role |
|---|---|
| `index.html` | Page shell: demo bar, `#app`, feedback panel, overlays, Turnstile slot |
| `styles.css` | All styling, in the Quiet Ink design language (section 9) |
| `data.js` | All demo data: the Acme company, people, documents, scripted answers, admin numbers, settings, plans |
| `app.js` | All behaviour: a hash router, event delegation maps (`A` for clicks, `F` for forms, `I` for inputs), auth, the employee app, the admin console, hand-drawn SVG charts, the demo controls, the feedback client |
| `config.js` | Where feedback goes: `endpoint` and `turnstileSiteKey`. Both are empty by default. |
| `feedback-worker/` | Cloudflare Worker and D1 schema that collect feedback, with a Node self-test and a README |

### 8.4 Demo facts

**Sign-in:**
- **Workspace:** Acme.
- **Accounts:** `priya@acme.com` (employee) and `suman@acme.com`
  (admin). Password `password123`, verification code `428913`.
- **Signing up** creates a new workspace that starts empty, so the
  admin lands on "Add a source". Once that source is indexed, the admin
  pages show Acme's numbers, labelled "Demo note: these are Acme's
  sample numbers".

**Seeded data:**
- **Sources:** Confluence with 1,102 documents (healthy) and Google
  Drive with 182 (failing, access expired). 1,284 documents in total.
- **Groups:** all-staff (312) contains engineering (84), which contains
  backend-guild (21) and frontend-guild (19). Also finance-team (14),
  and contractors (26), a deny group.

**Scripted answers.** Questions match by keyword. The scripted cases
are: full answers, a stale source, partial, not covered, and a
follow-up. Anything else gets "not covered", plus a demo note offering
to send the question to the team.

**Defaults:** confidence threshold 62%, answering model
`llama-3.1-8b-instruct`, search model `bge-base-en-v1.5`.

**Demo controls (the tab on the right edge):**
- force "answering service is down", an empty workspace, or a slow
  network
- sign in as either demo account
- jump to the sign-up, code, forgot-password and invite screens
- review and export the feedback stored on this device
- **Start fresh for the next person**: clears the demo but keeps the
  feedback

**Saved state.** The browser keeps the demo state under
`sambad-mock-v2` and the feedback under `sambad-feedback-v1`. State
saved by an older version is merged over new defaults.

### 8.5 Demo framing (required)

The demo MUST always make clear that it is a demo:
- **Demo bar.** A permanent bar at the top: "An interactive demo with
  made-up data. Sambad is still being built, so tell us what's missing
  or wrong."
- **First-visit intro.** Explains that the data is made up, the product
  is unfinished, and how to give feedback. It offers "Try it as an
  employee" and "Try it as an admin". It shows again after "Start
  fresh".
- **Demo notes.** Shown wherever the demo can't behave like the real
  product: unknown questions, and Acme's numbers inside a new
  workspace.

### 8.6 Feedback system

**Collecting it.** "Give feedback" in the demo bar opens a side panel
with these parts:
- an automatic "About <screen>" line, plus "Point at it", which lets
  the visitor click any element on screen to attach it
- a usefulness score from 1 to 5
- topics: confusing, missing, idea, bug, pricing, like
- a note of up to 2,000 characters
- an optional "About you" section: role, company size, and a contact
  email

Visitors also leave feedback in three other ways:
- "I'd need this" votes on planned features
- a price-band pick on the Plan tab
- "Send this question to the team" on questions the demo can't answer

**Where it's stored:**
1. Every entry is saved on the device first, so it survives offline
   venues.
2. When `config.js` sets an `endpoint`, queued entries are sent in
   batches of up to 10, each batch with a Cloudflare Turnstile token, to
   the Worker in `feedback-worker/`.
3. The Worker stores them in Cloudflare D1, owned by the project owner.
4. Without an endpoint, the presenter exports CSV or JSON from the Demo
   panel.
5. Entries the team hasn't received are never trimmed.

**Spam and abuse controls:**
- **Page and Worker:** a hidden trap field, a minimum time to fill the
  form, length limits, a 10-second cooldown, duplicate-note blocking,
  and 40 entries per visitor per day.
- **Worker only:**
  - an origin allowlist
  - a Turnstile token, verified on the server
  - schema validation
  - limits of 60 entries per IP per 10 minutes and 600 per day
  - IP addresses stored only as salted hashes
  - read-back only with a bearer token
- **Trust boundary:** checks on the page are for honest visitors. Only
  the Worker's checks are trusted.
- **Visitor ids:** "Start fresh" gives each person a new visitor id, so
  per-person limits never block the next visitor on a shared laptop.

**Setup:** see `feedback-worker/README.md`. As of 2026-11-15, the Worker
is written and tested locally, but not deployed.

### 8.7 Rules for changing the demo

- **Dependencies.** Plain HTML, CSS and JavaScript only. No build step,
  no frameworks. Fonts may come from Google Fonts; the Turnstile script
  loads only when it is configured.
- **Where content goes.** New demo content goes in `data.js`, and new
  behaviour goes in `app.js` using the existing `A`, `F` and `I`
  handler maps. Async handlers are guarded centrally against repeated
  clicks.
- **Escaping.** Escape every value that came from a user before putting
  it in HTML (`esc`).
- **Before calling it done:**
  - every flow works at desktop size and at 390px wide
  - `prefers-reduced-motion` is respected
  - there are no console errors
  - the demo bar and the intro still say what the demo is
- **The Worker.** Any change to it updates `feedback-worker/test.mjs`
  in the same change, and the test passes (`node test.mjs`).

---

## 9. Design language: Quiet Ink

The demo uses a style called Quiet Ink: quiet chrome, loud information.
The real frontend SHOULD follow it, unless the owner decides otherwise
(section 12).

**Look:**
- **Type.** Instrument Sans for the interface, Newsreader (a serif) for
  content people read: answers, quotes, headlines.
- **Surfaces.** A tinted rail on the left and an inset white canvas.
  Depth comes from hairlines and soft layered shadows. Corner radius
  steps up with size: 8px for controls, 10 for inputs, 12 for cards,
  16 for panels, 20 for the hero.
- **Colour.**
  - One accent: teal `#12564a`, with tints `#eef5f3`, `#d6e8e3`,
    `#a8cdc3` and `#6aa797`.
  - Muted states: warn `#8a6d1f`, bad `#9b3b32`, good `#2f6b4f`.
  - Ink `#1c1c1e` on paper `#fafafa`.
  - Colour always means something; it is never decoration.

**Patterns:**
- Lead with a narrative headline, then the numbers.
- Choose a chart that answers the question being asked: treemap,
  scatter with an action quadrant, heartbeat strip, piece map, icicle,
  threshold histogram.
- Use segmented controls, option cards, chips, drawers, hover cards and
  a ⌘K palette. Use dropdowns only for long lists.

**Copy:**
- Sentence case. Plain verbs.
- A button says what happens, and its toast repeats the same verb.
- Errors say what happened and how to fix it.
- No middle-dot meta strings, no arrows appended to links, no ALL-CAPS
  labels.

**Quality floor:**
- visible keyboard focus
- reduced motion respected
- 44px touch targets on phones
- responsive down to 360px wide

The owner's machine also has a reusable Quiet Ink skill at
`~/.claude/skills/quiet-ink/`.

---

## 10. Licence and business model

**Licence: PolyForm Noncommercial 1.0.0.** Personal and non-commercial
use is free. Selling Sambad, or selling a modified version of it,
requires a separate commercial licence from the owner. Required notice:
"Copyright 2026 Suman Pokhrel".

**Draft plans** (shown in the demo for feedback; **nothing is final**):

| Plan | Price | Includes |
|---|---|---|
| Community | Free | Personal and non-commercial use, self-hosted, every core feature: permission-aware answers, freshness, access audit |
| Business | Per person, per month (amount not set) | Commercial licence, SSO and SCIM, audit export, email support |
| Enterprise | Custom | Air-gapped installs, an uptime commitment, priority support, help with in-house connectors |

**Price research:** the demo asks visitors to pick a Business price
band: under $5, $5 to $10, $10 to $20, $20 to $30, or over $30. Interviews
SHOULD ask the Van Westendorp price questions: at what price would it be
too cheap to trust, a bargain, getting expensive, and too expensive. An
LLM MUST NOT set or publish a price.

---

## 11. Working rules (summary of `CLAUDE.md`)

**Tools and process:**
- `uv`, never `pip`, for anything Python.
- Commit messages are short and informative: 5 to 10 words.
- Ask before touching `.env` or `docker-compose.yml`, however small the
  change.
- Confirm before writing or running an Alembic migration.

**Files:**
- Every code file starts with a short header comment saying what it
  does and how it fits in.
- Match the existing layout. Ask before introducing a new layout or
  format.

**Writing:**
- No em dashes anywhere: code, comments, commits or docs. Use a period,
  comma, colon or parentheses.
- Secrets stay out of git. `.env` is ignored; `.env.example` is
  committed and kept in sync with what services read.

**Design discipline:**
- Write the story first. Non-obvious subsystems get a prose walkthrough
  in `docs/stories/` before any code.
- Record decisions. Anything expensive to reverse goes in
  `docs/decisions/`. Anything deliberately skipped goes in
  `docs/DEFERED.md`.
- Migrations from day one, and `workspace_id` on every table.

**Commands:**
- Don't invent commands. Use only ones backed by real config. Today
  that is `make up`, `down`, `logs`, `ps` and `restart`, plus `node
  test.mjs` in `feedback-worker/`.

---

## 12. Open questions (owner decides; do not settle by implementing)

1. **Pricing.** Business price per person, what goes in each tier, and
   whether SSO stays a paid feature.
2. **Email and password in the real product.** The demo has it as an
   alternative to SSO. Wireframe v1 said SSO only. Confirm it for the
   MVP.
3. **SSO protocol and providers for the MVP.** OIDC, SAML or both; and
   which of Okta, Entra ID and Google Workspace come first.
4. **The MVP connector.** Wireframe v1 says one connector. Confluence is
   assumed. Confirm it, and confirm the order for the rest.
5. **Frontend conventions.** Router, styling approach, component
   library, API client, and whether Quiet Ink becomes the design
   system.
6. **Data model.** The tables, the piece-level access rule
   representation, and how embeddings are stored (section 6.3
   candidates).
7. **Answering pipeline details.** The reranker, the plan-then-verify
   prompts, how confidence is computed for the threshold, and the
   evaluation method (`cli.py eval`).
8. **Tenancy.** One workspace per deployment or several. `workspace_id`
   is required either way.
9. **Staleness defaults.** 12 months, and the 6-month suppression after
   "still accurate", are demo values.
10. **Hosting the demo.** GitHub Pages or elsewhere, and deploying the
    feedback Worker.
11. **Target buyer** (section 3.2). Validate it with interviews before
    building for it.

---

## 13. Glossary

| Term | Meaning |
|---|---|
| Workspace | One organisation's Sambad. Every table carries `workspace_id`. |
| Source, connector | A system documents come from (Confluence, Drive, Notion, SharePoint, uploads), and the code that reads it |
| Piece (chunk) | The unit of a document that search returns and that access rules apply to. Employees see "piece" or "passage", never "chunk". |
| Allow and deny rules | Access rules mirrored from the source. A deny rule beats an allow rule. Nested groups are expanded when a question is asked. |
| Withheld | Pieces left out of an answer by a rule. Recorded only in the access audit. |
| Not covered (abstain) | Sambad declines to answer because no source supports it above the threshold |
| Partial answer | Some parts of the question are covered and the rest are named as missing |
| Stale | Not changed in a long time (12 months by default). Shown as a sentence on the source. |
| Knowledge gap | A cluster of questions the documents couldn't answer |
| Threshold | How sure Sambad must be before it answers (62% in the demo) |
| Sync run | One pass of a connector over its source: unchanged, re-indexed, skipped and failed documents |

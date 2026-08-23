# Sambad

**Ask your documents anything, and know where the answer came from.**

Self-hosted, privacy-first enterprise knowledge assistant with permission-aware
RAG and freshness controls, built to prevent data leaks and outdated answers.
Runs entirely on your own infrastructure. Bring your own model: local via
Ollama or vLLM, or a private cloud endpoint. `docker compose up`.

*Sambad* is Nepali for "dialogue."

> **Status:** under active development. Not usable yet.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js, TypeScript |
| Backend | FastAPI, Python |
| Database | PostgreSQL + pgvector |
| Jobs | Celery, Redis |
| Object storage | MinIO |
| Proxy | Caddy |
| Deploy | Docker Compose |

---

## Structure

```
sambad/
├── backend/           FastAPI service, Celery workers, CLI
├── frontend/          Next.js app
├── docker/            Config for third-party services
└── docs/              Decisions, schema, deferred work
```

### Backend

Everything under `backend/src/sambad/`.

```
main.py                FastAPI entrypoint
worker.py              Celery entrypoint
cli.py                 Developer commands: ingest, reindex, seed, eval
config.py              Environment and settings
db.py                  Database session and engine

models/                SQLAlchemy tables. The shape of the data.
schemas/               Pydantic models. Request and response contracts.
api/                   HTTP routers. Thin: validate, call core, return.

core/                  All business logic. No framework imports.
├── ingestion/         Parse, chunk, embed
├── retrieval/         Search, permission filter, rerank
├── generation/        Prompts, agentic loop, abstain
├── permissions/       Group expansion, rule evaluation
└── freshness/         Content hashing, staleness, reconciliation

connectors/            Document sources. Base class + implementations.
llm/                   Model providers. Base class + Ollama + API.
storage/               Object storage. S3-compatible client over MinIO.
tasks/                 Celery tasks. Thin wrappers over core.
```

**Why `core/` is separate.** It holds the parts that matter and imports no
web framework or task queue. Permission evaluation can be tested without
starting a server; ingestion can be tested without Redis running. The API,
the CLI, and the workers are three thin callers of the same logic.

**Why `connectors/` and `llm/` sit at the top level.** They are the two real
plugin points. Adding a document source or a model provider should mean adding
one class, not editing five files.

**What lives in object storage.** Uploaded files only. Sambad is the sole copy
of anything a user uploads, so the original bytes are kept and addressed by
content hash. Documents pulled from a connector are parsed and discarded, since
the source system remains the source of truth and duplicating confidential
files is the opposite of the point. MinIO speaks S3, so the same code runs
against S3 or any compatible store by changing configuration.

### Frontend

```
app/                   Routes (App Router)
components/            UI components
lib/                   API client, hooks, utilities
```

### Docker

Two kinds of container here, split by who owns the image.

**Built from source.** `backend/` and `frontend/` are code, so each has its own
`Dockerfile` sitting next to what it builds. The backend image serves double
duty: the API and the Celery workers run the same image with different commands.

**Pulled and configured.** Postgres, Redis, Caddy, and MinIO ship official
images that are never built, only configured. Anything they need mounted lives
under `docker/`, one folder per service:

```
docker/
├── caddy/Caddyfile          Reverse proxy routing and TLS
└── postgres/init.sql        Enables the pgvector extension on first boot
```

These are config files, not Dockerfiles. Compose mounts them read-only into
the official images. Redis takes its settings as command flags and MinIO as
environment variables, so neither needs a folder. Keeping them here rather
than loose in the repo root means infrastructure config is never mistaken
for application code.

### Docs

```
decisions/             One file per architectural decision: what, why, what was rejected
stories/               Prose walkthroughs of key flows, written before the code
SCHEMA.md              Data model reference
DEFERRED.md            Things deliberately not built, and what makes them possible later
```

---

## Conventions

**Migrations from day one.** Every schema change is an Alembic migration.
No manual edits to a running database, ever.

**`workspace_id` on every table.** Present from the first migration even
while there is one workspace. Cheap now, painful to retrofit.

**Permission filtering happens inside the query.** Never fetch results and
filter afterwards. Post-filtering silently degrades relevance and is how
leaks happen.

**Tasks are idempotent.** Every job is keyed on a content hash and safe to
run twice. Redis dispatches work; Postgres holds the truth. A lost message
is recovered by reconciliation, not by trusting the queue.

**Abstractions need evidence.** Interfaces exist for connectors and models
because those will have multiple implementations. Nothing is abstracted on
speculation.

**Write the story first.** Non-obvious subsystems get a prose walkthrough in
`docs/stories/` before any code. It surfaces schema gaps while they are still
free to fix.

**Decisions get recorded.** Anything expensive to reverse goes in
`docs/decisions/` as a short note. Anything deliberately skipped goes in
`DEFERRED.md`.

**Secrets stay out.** `.env` is gitignored; `.env.example` is committed.
Credentials are never logged and never appear in the audit trail.

---

## Development

```bash
cp .env.example .env
make up          # start the stack
make migrate     # apply migrations
make seed        # create the demo workspace
make test
```

---


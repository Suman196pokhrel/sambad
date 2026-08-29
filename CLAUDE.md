# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Sambad ("dialogue" in Nepali) is a self-hosted, privacy-first enterprise
knowledge assistant: permission-aware RAG over an organization's documents,
with freshness controls, designed to run entirely on the user's own
infrastructure (local or private-cloud LLM, no external API dependency
required).

## Current state — read this before assuming anything exists

**This repository is a pre-implementation scaffold.** Every file under
`backend/src/sambad/` (`main.py`, `worker.py`, `config.py`, `db.py`, `cli.py`)
is a 0-byte placeholder, as are `backend/pyproject.toml`, `backend/Dockerfile`,
`backend/alembic.ini`, and `frontend/Dockerfile`. The subpackages
`backend/src/sambad/{api,core,models,schemas,tasks}` exist as empty
directories with no `__init__.py`. `backend/tests/` and `backend/alembic/`
are empty. `frontend/` has no `package.json` or app code yet — only a
`Dockerfile` placeholder. `docs/decisions/`, `docs/stories/`, `docs/SCHEMA.md`,
and `docs/DEFERED.md` are empty too.

Practical implications:
- There is no Python package manager, linter, type checker, or test runner
  configured yet (`pyproject.toml` is empty). Don't assume `pytest`, `ruff`,
  `mypy`, `poetry`, or `uv` are wired up — check before invoking them, and
  when you do set one up, follow the conventions below.
- There is no Next.js app yet. `frontend/` needs to be scaffolded from
  scratch when frontend work begins.
- The README's `make migrate` / `make seed` / `make test` are the intended
  future workflow, not current reality — only `up`, `down`, `logs`, `ps`,
  `restart` exist in the `Makefile` today (see Commands below).
- `docs/sambad-wireframes-full.html` is the existing UI reference/mockup for
  frontend work; there's no built frontend to compare it against yet.

When adding real code, follow the architecture and conventions documented
below — they describe the intended design this codebase is meant to grow
into, agreed upon before any code was written.

## Commands

```bash
cp .env.example .env      # required before any docker compose command
make up                    # start the full stack (docker compose, dev overlay)
make down                  # stop the stack
make logs                  # follow logs for all services
make ps                    # show service status
make restart               # down + up
```

`make` wraps `docker compose -f docker-compose.yml -f docker-compose.dev.yml`.
The dev overlay (`docker-compose.dev.yml`) adds: live-reload for `api`
(`uvicorn --reload` bind-mounting `./backend/src`), an auto-restarting Celery
`worker` (via `watchmedo`), host-exposed ports for `db` (5432) and `minio`
console (9001), and adds `pgadmin` (5050) and `redis-ui` (5540) for local
inspection. None of this is present in the base `docker-compose.yml`, which
is the production shape.

Service startup order is enforced via `depends_on: condition: service_healthy`
— `api` and `worker` wait on `db`, `redis`, and `minio` healthchecks, and
`caddy` waits on `api`. The `frontend` service is commented out in
`docker-compose.yml` pending the Next.js scaffold.

Once backend tooling exists, add its actual lint/test/migrate commands here
rather than guessing — do not invent `pytest`/`ruff`/`alembic` invocations
that aren't backed by a real config.

## Architecture

### Backend (`backend/src/sambad/`, once populated)

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

`connectors/`, `llm/`, `storage/` don't exist on disk yet — create them at
the top level of `sambad/` (siblings of `core/`, not nested inside it) when
that work starts.

**Why `core/` is separate.** It holds the logic that matters and imports no
web framework or task queue. Permission evaluation can be tested without
starting a server; ingestion can be tested without Redis running. The API,
the CLI, and the workers are three thin callers of the same logic — don't
put business logic in `api/` routers or `tasks/` wrappers.

**Why `connectors/` and `llm/` sit at the top level.** They are the two real
plugin points. Adding a document source or a model provider should mean
adding one class, not editing five files.

**What lives in object storage (MinIO).** Uploaded files only, addressed by
content hash — Sambad is the sole copy of anything a user uploads. Documents
pulled from a connector are parsed and discarded (not duplicated into
storage), since the source system remains the source of truth.

### Frontend (`frontend/`, once scaffolded)

```
app/                   Routes (App Router)
components/            UI components
lib/                   API client, hooks, utilities
```

### Docker

Two kinds of container, split by who owns the image:

- **Built from source**: `backend/` and `frontend/` each have their own
  `Dockerfile`. The backend image serves double duty — `api` and `worker`
  run the *same* image with different commands (`uvicorn ...` vs
  `celery -A sambad.worker.celery_app worker ...`).
- **Pulled and configured**: `db` (pgvector/pgvector:pg16), `redis`, `minio`,
  `caddy` use official images, never built. Anything they need mounted lives
  under `docker/<service>/`, e.g. `docker/caddy/Caddyfile` (routes `/api/*`
  to `api:8000`, everything else served by Caddy directly) and
  `docker/postgres/init.sql` (enables the `vector` extension on first boot).

### Docs

```
decisions/    One file per architectural decision: what, why, what was rejected
stories/      Prose walkthroughs of key flows, written before the code
SCHEMA.md     Data model reference
DEFERED.md    Things deliberately not built, and what makes them possible later
```

All currently empty — populate them as the corresponding decisions/flows/
schema/deferrals materialize, per the conventions below.

## Conventions

- **Migrations from day one.** Every schema change is an Alembic migration.
  No manual edits to a running database, ever.
- **`workspace_id` on every table.** Present from the first migration even
  while there is one workspace. Cheap now, painful to retrofit.
- **Permission filtering happens inside the query.** Never fetch results and
  filter afterwards — post-filtering silently degrades relevance and is how
  leaks happen.
- **Tasks are idempotent.** Every Celery job is keyed on a content hash and
  safe to run twice. Redis dispatches work; Postgres holds the truth. A lost
  message is recovered by reconciliation, not by trusting the queue.
- **Abstractions need evidence.** Interfaces exist for `connectors/` and
  `llm/` because those will have multiple implementations. Don't add
  abstraction layers elsewhere on speculation.
- **Write the story first.** Non-obvious subsystems get a prose walkthrough
  in `docs/stories/` before any code, to surface schema gaps while they're
  still free to fix.
- **Decisions get recorded.** Anything expensive to reverse goes in
  `docs/decisions/` as a short note. Anything deliberately skipped goes in
  `docs/DEFERED.md` (note: filename has no double-R).
- **Secrets stay out of git.** `.env` is gitignored; `.env.example` is
  committed and kept in sync with what services actually read.

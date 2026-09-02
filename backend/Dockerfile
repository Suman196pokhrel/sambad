# syntax=docker/dockerfile:1
# Dockerfile
# Builds the Sambad backend image. The api and worker services in
# docker-compose.yml both run this same image, differing only in the
# command each one passes at runtime.

# Stage 1 ("builder"): installs uv and dependencies, builds the venv.
# Everything here gets discarded except what the final stage copies
# out below, so build tools and caches never reach the shipped image.
FROM python:3.14-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# The cache mount persists uv's package cache across builds (kept
# outside the image, not baked into a layer), so re-running uv sync
# does not redownload every dependency each time.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY src ./src
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev


# Stage 2 (final image): starts fresh from a clean base and copies
# in only the finished venv and source, none of the build tooling
# or caches from the builder stage, so the shipped image stays slim.
FROM python:3.14-slim

WORKDIR /app

COPY --from=builder /app/.venv ./.venv
COPY --from=builder /app/src ./src

ENV PATH="/app/.venv/bin:$PATH"

CMD ["uvicorn", "sambad.main:app", "--host", "0.0.0.0", "--port", "8000"]

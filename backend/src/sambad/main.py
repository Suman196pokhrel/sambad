# main.py
# FastAPI entrypoint. Builds the ASGI app, wires startup/shutdown,
# and mounts API routers. This is what uvicorn points at in
# docker-compose.yml (uvicorn sambad.main:app).
from fastapi import FastAPI
from contextlib import asynccontextmanager
from sambad.core.db import engine
from sambad.core.redis import redis_client
from sambad.storage.client import ensure_bucket
from sqlalchemy import text

# Routers
from sambad.api.auth_router import router as auth_router



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify dependencies are reachable before serving traffic.
    print("fastapi startup")
    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    await redis_client.ping()
    # boto3 is sync, fine here since nothing is serving requests yet.
    ensure_bucket()
    yield
    # Shutdown: close them here.
    await engine.dispose()
    await redis_client.aclose()
    print("fastapi shutdown")

    

app = FastAPI(title="Sambad", version="0.1.0",lifespan=lifespan)


@app.get("/health")
async def health()->dict[str,str]:
    return {"status":"ok"}



# Real endpoints live under api/ and mount here with prefix="/api",
# since that's the only path Caddy forwards to this service.
app.include_router(auth_router, prefix="/api")





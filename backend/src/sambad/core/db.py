# db.py
# Async SQLAlchemy engine and session factory. Anything that talks to
# Postgres gets its session from get_session, nothing opens its own engine.

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from sambad.core.config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True)

async_session = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session

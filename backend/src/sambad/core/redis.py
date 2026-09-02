# redis.py
# Async Redis client. Celery manages its own connection for task
# dispatch (see worker.py); this client is for anything else that
# talks to Redis directly, such as the startup health check in main.py.

from redis.asyncio import Redis

from sambad.core.config import settings

redis_client = Redis.from_url(settings.redis_url)

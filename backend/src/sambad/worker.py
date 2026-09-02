# worker.py
# Celery entrypoint. The worker service in docker-compose.yml points
# at celery_app here. Redis is only the broker, dispatching task
# messages; Postgres stays the source of truth, so a lost message is
# recovered by reconciliation, not by trusting the queue.

from celery import Celery

from sambad.core.config import settings

celery_app = Celery("sambad", broker=settings.redis_url, backend=settings.redis_url)

# config.py
# Typed application settings, loaded once from environment variables.
# Every other module reads config through the `settings` instance here
# instead of calling os.environ directly.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    redis_url: str
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str
    secret_key: str


settings = Settings()

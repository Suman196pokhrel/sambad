# client.py
# S3-compatible client over MinIO. Uploaded files are the only thing
# that lives here, addressed by content hash: documents pulled from a
# connector are parsed and discarded, never duplicated into storage.

import boto3

from sambad.core.config import settings

client = boto3.client(
    "s3",
    endpoint_url=f"http://{settings.minio_endpoint}",
    aws_access_key_id=settings.minio_access_key,
    aws_secret_access_key=settings.minio_secret_key,
)


def ensure_bucket() -> None:
    existing = {b["Name"] for b in client.list_buckets()["Buckets"]}
    if settings.minio_bucket not in existing:
        client.create_bucket(Bucket=settings.minio_bucket)

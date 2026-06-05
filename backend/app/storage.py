"""
Storage abstraction:
  local  → saves to backend/uploads/ (no MinIO needed for dev)
  production → MinIO via boto3 (S3-compatible)
"""
import os
import uuid
from pathlib import Path

from app.core.config import settings

# Local uploads directory (used in local environment)
LOCAL_UPLOAD_DIR = Path(__file__).parent.parent / "uploads"
LOCAL_UPLOAD_DIR.mkdir(exist_ok=True)


def _is_local() -> bool:
    return settings.ENVIRONMENT == "local"


def upload_file(file_bytes: bytes, filename: str, content_type: str) -> str:
    """
    Save file and return storage_path key.
    """
    key = f"{uuid.uuid4().hex}_{filename}"

    if _is_local():
        dest = LOCAL_UPLOAD_DIR / key
        dest.write_bytes(file_bytes)
        return f"local://{key}"

    # MinIO / S3
    import boto3
    from botocore.client import Config

    s3 = boto3.client(
        "s3",
        endpoint_url=settings.MINIO_ENDPOINT,
        aws_access_key_id=settings.MINIO_ROOT_USER,
        aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
        config=Config(signature_version="s3v4"),
    )
    bucket = settings.MINIO_BUCKET_DEALS
    # Ensure bucket exists
    try:
        s3.head_bucket(Bucket=bucket)
    except Exception:
        s3.create_bucket(Bucket=bucket)

    s3.put_object(Bucket=bucket, Key=key, Body=file_bytes, ContentType=content_type)
    return f"minio://{bucket}/{key}"


def get_download_url(storage_path: str, filename: str) -> str:
    """
    Return a URL to download/preview the file.
    Local: direct file serve URL.
    MinIO: presigned URL (15 min TTL).
    """
    if storage_path.startswith("local://"):
        key = storage_path.removeprefix("local://")
        return f"/api/v1/documents/serve/{key}"

    # MinIO presigned URL.
    # Presign against the PUBLIC endpoint so the signature matches the host
    # the browser will actually hit. If MINIO_PUBLIC_ENDPOINT is unset, fall
    # back to the internal endpoint (dev / same-network only).
    import boto3
    from botocore.client import Config

    parts = storage_path.removeprefix("minio://").split("/", 1)
    bucket, key = parts[0], parts[1]

    public_endpoint = settings.MINIO_PUBLIC_ENDPOINT or settings.MINIO_ENDPOINT
    s3 = boto3.client(
        "s3",
        endpoint_url=public_endpoint,
        aws_access_key_id=settings.MINIO_ROOT_USER,
        aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
        config=Config(signature_version="s3v4"),
    )
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key, "ResponseContentDisposition": f'inline; filename="{filename}"'},
        ExpiresIn=900,
    )


def delete_file(storage_path: str) -> None:
    if storage_path.startswith("local://"):
        key = storage_path.removeprefix("local://")
        p = LOCAL_UPLOAD_DIR / key
        if p.exists():
            p.unlink()
        return

    import boto3
    from botocore.client import Config

    parts = storage_path.removeprefix("minio://").split("/", 1)
    bucket, key = parts[0], parts[1]
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.MINIO_ENDPOINT,
        aws_access_key_id=settings.MINIO_ROOT_USER,
        aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
        config=Config(signature_version="s3v4"),
    )
    s3.delete_object(Bucket=bucket, Key=key)

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING, AsyncIterator
from urllib.parse import urlparse, urlunparse

import aioboto3
from botocore.exceptions import ClientError

if TYPE_CHECKING:
    from types_aiobotocore_s3 import S3Client

from agnt_api.config import Settings, get_settings

logger = logging.getLogger(__name__)


class Storage:
    """Async S3-compatible object storage client.

    Works with MinIO locally and AWS S3 in production.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._session = aioboto3.Session()

        # Pre-parse URLs used by _rewrite_presigned_url to avoid
        # repeated parsing on every presigned-URL call.
        public_url = (settings.s3_public_url or "").strip()
        self._parsed_public = urlparse(public_url) if public_url else None
        self._endpoint_path = urlparse(settings.s3_endpoint_url).path.rstrip("/")

    @asynccontextmanager
    async def _client(self) -> AsyncIterator[S3Client]:
        async with self._session.client(
            "s3",
            endpoint_url=self._settings.s3_endpoint_url,
            aws_access_key_id=self._settings.s3_access_key,
            aws_secret_access_key=self._settings.s3_secret_key,
            region_name=self._settings.s3_region,
        ) as client:
            yield client

    async def ensure_bucket(self) -> None:
        """Create the configured bucket if it does not exist."""
        async with self._client() as client:
            try:
                await client.head_bucket(Bucket=self._settings.s3_bucket)
            except ClientError:
                await client.create_bucket(Bucket=self._settings.s3_bucket)
                logger.info("Created bucket %s", self._settings.s3_bucket)

    async def upload(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload bytes to object storage. Returns the object key."""
        async with self._client() as client:
            await client.put_object(
                Bucket=self._settings.s3_bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            )
        return key

    async def presigned_url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a presigned GET URL for an object."""
        async with self._client() as client:
            url: str = await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._settings.s3_bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        return self._rewrite_presigned_url(url)

    async def delete(self, key: str) -> None:
        """Delete an object from storage."""
        async with self._client() as client:
            await client.delete_object(
                Bucket=self._settings.s3_bucket,
                Key=key,
            )

    def _rewrite_presigned_url(self, url: str) -> str:
        parsed_public = self._parsed_public
        if parsed_public is None or not parsed_public.scheme or not parsed_public.netloc:
            return url

        parsed_url = urlparse(url)

        path = parsed_url.path or "/"
        endpoint_path = self._endpoint_path
        if endpoint_path:
            if path == endpoint_path:
                path = "/"
            elif path.startswith(endpoint_path + "/"):
                path = path[len(endpoint_path):]

        public_path = parsed_public.path.rstrip("/")
        if not path.startswith("/"):
            path = "/" + path
        rewritten_path = f"{public_path}{path}" if public_path else path

        return urlunparse(
            (
                parsed_public.scheme,
                parsed_public.netloc,
                rewritten_path,
                parsed_url.params,
                parsed_url.query,
                parsed_url.fragment,
            )
        )


_storage: Storage | None = None


def get_storage() -> Storage:
    """Return a singleton Storage instance."""
    global _storage
    if _storage is None:
        _storage = Storage(get_settings())
    return _storage


def reset_storage() -> None:
    """Reset the singleton (used for testing)."""
    global _storage
    _storage = None

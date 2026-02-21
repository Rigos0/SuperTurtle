from __future__ import annotations

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import pytest
from botocore.exceptions import ClientError

from agnt_api.config import Settings
from agnt_api.storage import Storage


@pytest.fixture()
def settings() -> Settings:
    return Settings(
        s3_endpoint_url="http://localhost:9002",
        s3_access_key="minioadmin",
        s3_secret_key="minioadmin",
        s3_bucket="test-bucket",
        s3_region="us-east-1",
    )


def build_storage(settings: Settings, mock_s3_client: AsyncMock) -> Storage:
    s = Storage(settings)

    @asynccontextmanager
    async def _mock_client():
        yield mock_s3_client

    s._client = _mock_client  # type: ignore[assignment]
    return s


@pytest.fixture()
def mock_s3_client() -> AsyncMock:
    client = AsyncMock()
    client.head_bucket = AsyncMock()
    client.create_bucket = AsyncMock()
    client.put_object = AsyncMock()
    client.delete_object = AsyncMock()
    client.generate_presigned_url = AsyncMock(return_value="https://example.com/presigned")
    return client


@pytest.fixture()
def storage(settings: Settings, mock_s3_client: AsyncMock) -> Storage:
    return build_storage(settings, mock_s3_client)


async def test_ensure_bucket_creates_when_missing(
    storage: Storage, mock_s3_client: AsyncMock, settings: Settings
) -> None:
    mock_s3_client.head_bucket.side_effect = ClientError(
        {"Error": {"Code": "404", "Message": "Not Found"}}, "HeadBucket"
    )
    await storage.ensure_bucket()
    mock_s3_client.create_bucket.assert_called_once_with(Bucket=settings.s3_bucket)


async def test_ensure_bucket_skips_when_exists(
    storage: Storage, mock_s3_client: AsyncMock
) -> None:
    mock_s3_client.head_bucket.return_value = {}
    await storage.ensure_bucket()
    mock_s3_client.create_bucket.assert_not_called()


async def test_upload(
    storage: Storage, mock_s3_client: AsyncMock, settings: Settings
) -> None:
    key = await storage.upload("jobs/123/output.txt", b"hello", "text/plain")
    assert key == "jobs/123/output.txt"
    mock_s3_client.put_object.assert_called_once_with(
        Bucket=settings.s3_bucket,
        Key="jobs/123/output.txt",
        Body=b"hello",
        ContentType="text/plain",
    )


async def test_presigned_url_no_rewrite_when_public_url_unset(
    storage: Storage, mock_s3_client: AsyncMock, settings: Settings
) -> None:
    """When s3_public_url is None the presigned URL passes through unchanged."""
    url = await storage.presigned_url("jobs/123/output.txt", expires_in=600)
    assert url == "https://example.com/presigned"
    mock_s3_client.generate_presigned_url.assert_called_once_with(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": "jobs/123/output.txt"},
        ExpiresIn=600,
    )


async def test_delete(
    storage: Storage, mock_s3_client: AsyncMock, settings: Settings
) -> None:
    await storage.delete("jobs/123/output.txt")
    mock_s3_client.delete_object.assert_called_once_with(
        Bucket=settings.s3_bucket,
        Key="jobs/123/output.txt",
    )


async def test_presigned_url_rewrites_for_public_host(
    mock_s3_client: AsyncMock,
) -> None:
    settings = Settings(
        s3_endpoint_url="http://minio:9000",
        s3_public_url="http://localhost:9002",
        s3_access_key="minioadmin",
        s3_secret_key="minioadmin",
        s3_bucket="test-bucket",
        s3_region="us-east-1",
    )
    mock_s3_client.generate_presigned_url = AsyncMock(
        return_value="http://minio:9000/test-bucket/jobs/123/output.txt?X-Amz-Signature=abc"
    )
    storage = build_storage(settings, mock_s3_client)

    url = await storage.presigned_url("jobs/123/output.txt", expires_in=600)

    assert url == "http://localhost:9002/test-bucket/jobs/123/output.txt?X-Amz-Signature=abc"


async def test_presigned_url_no_rewrite_when_public_url_invalid(
    mock_s3_client: AsyncMock,
) -> None:
    """An invalid S3_PUBLIC_URL (missing scheme/netloc) skips rewriting."""
    settings = Settings(
        s3_endpoint_url="http://minio:9000",
        s3_public_url="not-a-url",
        s3_access_key="minioadmin",
        s3_secret_key="minioadmin",
        s3_bucket="test-bucket",
        s3_region="us-east-1",
    )
    original = "http://minio:9000/test-bucket/jobs/123/output.txt?X-Amz-Signature=abc"
    mock_s3_client.generate_presigned_url = AsyncMock(return_value=original)
    storage = build_storage(settings, mock_s3_client)

    url = await storage.presigned_url("jobs/123/output.txt", expires_in=600)

    assert url == original


async def test_presigned_url_rewrites_with_endpoint_subpath(
    mock_s3_client: AsyncMock,
) -> None:
    settings = Settings(
        s3_endpoint_url="http://minio:9000/internal",
        s3_public_url="https://files.example.com/minio",
        s3_access_key="minioadmin",
        s3_secret_key="minioadmin",
        s3_bucket="test-bucket",
        s3_region="us-east-1",
    )
    mock_s3_client.generate_presigned_url = AsyncMock(
        return_value="http://minio:9000/internal/test-bucket/jobs/123/output.txt?X-Amz-Signature=abc"
    )
    storage = build_storage(settings, mock_s3_client)

    url = await storage.presigned_url("jobs/123/output.txt", expires_in=600)

    assert (
        url
        == "https://files.example.com/minio/test-bucket/jobs/123/output.txt?X-Amz-Signature=abc"
    )

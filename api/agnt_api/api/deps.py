from collections.abc import AsyncIterator
from secrets import compare_digest

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from agnt_api.api.errors import ApiError
from agnt_api.config import Settings, get_settings
from agnt_api.db import get_db_session
from agnt_api.storage import Storage
from agnt_api.storage import get_storage as _get_storage


async def get_session() -> AsyncIterator[AsyncSession]:
    async for session in get_db_session():
        yield session


def get_storage() -> Storage:
    return _get_storage()


def get_app_settings() -> Settings:
    return get_settings()


def require_buyer_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_app_settings),
) -> None:
    provided_key = _extract_api_key(x_api_key, authorization)
    if not compare_digest(provided_key, settings.buyer_api_key):
        raise ApiError(
            status_code=401,
            error="invalid_api_key",
            message="Invalid API key for buyer endpoint.",
        )


def require_executor_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_app_settings),
) -> None:
    provided_key = _extract_api_key(x_api_key, authorization)
    if not compare_digest(provided_key, settings.executor_api_key):
        raise ApiError(
            status_code=401,
            error="invalid_api_key",
            message="Invalid API key for executor endpoint.",
        )


def _extract_api_key(x_api_key: str | None, authorization: str | None) -> str:
    if x_api_key:
        return x_api_key.strip()
    if not authorization:
        return ""

    scheme, _, credentials = authorization.partition(" ")
    if scheme.lower() != "bearer" or not credentials:
        return ""
    return credentials.strip()

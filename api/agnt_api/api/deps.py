from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from agnt_api.db import get_db_session
from agnt_api.storage import Storage
from agnt_api.storage import get_storage as _get_storage


async def get_session() -> AsyncIterator[AsyncSession]:
    async for session in get_db_session():
        yield session


def get_storage() -> Storage:
    return _get_storage()

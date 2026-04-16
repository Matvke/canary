from collections.abc import AsyncGenerator

from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session

from typing import Any, List

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Inspection


class InspectionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, payload: dict[str, Any]) -> Inspection:
        entity = Inspection(**payload)
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def list(self) -> List[Inspection]:
        statement = select(Inspection).order_by(Inspection.id)
        result = await self.session.exec(statement)
        return list(result.all())

    async def get_by_id(self, inspection_id: int) -> Inspection | None:
        return await self.session.get(Inspection, inspection_id)

    async def update(self, inspection_id: int, payload: dict[str, Any]) -> Inspection | None:
        entity = await self.get_by_id(inspection_id)
        if not entity:
            return None

        for field, value in payload.items():
            setattr(entity, field, value)

        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def delete(self, inspection_id: int) -> bool:
        entity = await self.get_by_id(inspection_id)
        if not entity:
            return False

        await self.session.delete(entity)
        await self.session.commit()
        return True

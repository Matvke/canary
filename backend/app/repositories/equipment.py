from typing import Any

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Equipment, Inspection


class EquipmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, payload: dict[str, Any]) -> Equipment:
        entity = Equipment(**payload)
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def list(self) -> list[Equipment]:
        statement = select(Equipment).order_by(Equipment.id)
        result = await self.session.exec(statement)
        return list(result.all())

    async def get_by_id(self, equipment_id: int) -> Equipment | None:
        return await self.session.get(Equipment, equipment_id)

    async def update(
        self, equipment_id: int, payload: dict[str, Any]
    ) -> Equipment | None:
        entity = await self.get_by_id(equipment_id)
        if not entity:
            return None

        for field, value in payload.items():
            setattr(entity, field, value)

        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def delete(self, equipment_id: int) -> bool:
        entity = await self.get_by_id(equipment_id)
        if not entity:
            return False

        await self.session.delete(entity)
        await self.session.commit()
        return True

    async def get_inspection_ids(self, equipment_id: int) -> list[int]:
        statement = (
            select(Inspection.id)
            .where(Inspection.equipment_id == equipment_id)
            .order_by(Inspection.id)
        )
        result = await self.session.exec(statement)
        return list(result.all())

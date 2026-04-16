from typing import Any

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Employee, Inspection


class EmployeeRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, payload: dict[str, Any]) -> Employee:
        entity = Employee(**payload)
        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def list(self) -> list[Employee]:
        statement = select(Employee).order_by(Employee.id)
        result = await self.session.exec(statement)
        return list(result.all())

    async def get_by_id(self, employee_id: int) -> Employee | None:
        return await self.session.get(Employee, employee_id)

    async def update(self, employee_id: int, payload: dict[str, Any]) -> Employee | None:
        entity = await self.get_by_id(employee_id)
        if not entity:
            return None

        for field, value in payload.items():
            setattr(entity, field, value)

        self.session.add(entity)
        await self.session.commit()
        await self.session.refresh(entity)
        return entity

    async def delete(self, employee_id: int) -> bool:
        entity = await self.get_by_id(employee_id)
        if not entity:
            return False

        await self.session.delete(entity)
        await self.session.commit()
        return True

    async def get_inspection_ids(self, employee_id: int) -> list[int]:
        statement = (
            select(Inspection.id)
            .where(Inspection.employee_id == employee_id)
            .order_by(Inspection.id)
        )
        result = await self.session.exec(statement)
        return list(result.all())

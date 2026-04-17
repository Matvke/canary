from typing import Any

from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import Equipment, InspectionPlan


class InspectionPlanRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, payload: dict[str, Any], equipment_ids: list[int]) -> InspectionPlan:
        plan = InspectionPlan(**payload)
        plan.equipment_items = await self._get_equipment_by_ids(equipment_ids)

        self.session.add(plan)
        await self.session.commit()
        await self.session.refresh(plan)

        if plan.id is None:
            raise RuntimeError("Failed to persist inspection plan")

        created = await self.get_by_id(plan.id)
        if not created:
            raise RuntimeError("Failed to load created inspection plan")
        return created

    async def list(self) -> list[InspectionPlan]:
        statement = (
            select(InspectionPlan)
            .options(selectinload(InspectionPlan.equipment_items))
            .order_by(InspectionPlan.id)
        )
        result = await self.session.exec(statement)
        return list(result.all())

    async def get_by_id(self, plan_id: int) -> InspectionPlan | None:
        statement = (
            select(InspectionPlan)
            .where(InspectionPlan.id == plan_id)
            .options(selectinload(InspectionPlan.equipment_items))
        )
        result = await self.session.exec(statement)
        return result.first()

    async def update(
        self,
        plan_id: int,
        payload: dict[str, Any],
        equipment_ids: list[int] | None = None,
    ) -> InspectionPlan | None:
        plan = await self.get_by_id(plan_id)
        if not plan:
            return None

        for field, value in payload.items():
            setattr(plan, field, value)

        if equipment_ids is not None:
            plan.equipment_items = await self._get_equipment_by_ids(equipment_ids)

        self.session.add(plan)
        await self.session.commit()

        if plan.id is None:
            return None

        return await self.get_by_id(plan.id)

    async def delete(self, plan_id: int) -> bool:
        plan = await self.get_by_id(plan_id)
        if not plan:
            return False

        await self.session.delete(plan)
        await self.session.commit()
        return True

    async def _get_equipment_by_ids(self, equipment_ids: list[int]) -> list[Equipment]:
        statement = (
            select(Equipment)
            .where(Equipment.id.in_(equipment_ids))
            .order_by(Equipment.id)
        )
        result = await self.session.exec(statement)
        return list(result.all())

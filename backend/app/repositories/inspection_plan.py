from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import selectinload
from sqlmodel import delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models import (
    Equipment,
    InspectionPlan,
    InspectionPlanAssignment,
    InspectionPlanStep,
)

UNSET = object()


class InspectionPlanRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        payload: dict[str, Any],
        equipment_ids: list[int],
        employee_id: int | None = None,
    ) -> InspectionPlan:
        unique_equipment_ids = self._unique_equipment_ids(equipment_ids)
        plan = InspectionPlan(**payload)
        plan.equipment_items = await self._get_equipment_by_ids(unique_equipment_ids)

        self.session.add(plan)
        await self.session.flush()

        if plan.id is None:
            raise RuntimeError("Failed to persist inspection plan")

        self.session.add_all(
            [
                InspectionPlanStep(
                    plan_id=plan.id,
                    equipment_id=equipment_id,
                    step_order=step_order,
                )
                for step_order, equipment_id in enumerate(unique_equipment_ids, start=1)
            ]
        )

        if employee_id is not None:
            self.session.add(
                InspectionPlanAssignment(
                    plan_id=plan.id,
                    employee_id=employee_id,
                )
            )

        await self.session.commit()

        created = await self.get_by_id(plan.id)
        if not created:
            raise RuntimeError("Failed to load created inspection plan")
        return created

    async def list(self) -> list[InspectionPlan]:
        statement = (
            select(InspectionPlan)
            .options(
                selectinload(InspectionPlan.equipment_items),
                selectinload(InspectionPlan.steps).selectinload(InspectionPlanStep.equipment),
            )
            .order_by(InspectionPlan.id)
        )
        result = await self.session.exec(statement)
        return list(result.all())

    async def get_by_id(self, plan_id: int) -> InspectionPlan | None:
        statement = (
            select(InspectionPlan)
            .where(InspectionPlan.id == plan_id)
            .options(
                selectinload(InspectionPlan.equipment_items),
                selectinload(InspectionPlan.steps).selectinload(InspectionPlanStep.equipment),
            )
        )
        result = await self.session.exec(statement)
        return result.first()

    async def update(
        self,
        plan_id: int,
        payload: dict[str, Any],
        equipment_ids: list[int] | None = None,
        employee_id: int | None | object = UNSET,
    ) -> InspectionPlan | None:
        plan = await self.get_by_id(plan_id)
        if not plan:
            return None

        for field, value in payload.items():
            setattr(plan, field, value)

        if equipment_ids is not None:
            unique_equipment_ids = self._unique_equipment_ids(equipment_ids)
            plan.equipment_items = await self._get_equipment_by_ids(unique_equipment_ids)
            await self.session.exec(
                delete(InspectionPlanStep).where(InspectionPlanStep.plan_id == plan_id)
            )
            self.session.add_all(
                [
                    InspectionPlanStep(
                        plan_id=plan_id,
                        equipment_id=equipment_id,
                        step_order=step_order,
                    )
                    for step_order, equipment_id in enumerate(unique_equipment_ids, start=1)
                ]
            )

        if employee_id is not UNSET:
            assignment = await self._get_assignment(plan_id)
            if employee_id is None and assignment:
                await self.session.delete(assignment)
            elif employee_id is not None and assignment:
                assignment.employee_id = employee_id
                self.session.add(assignment)
            elif employee_id is not None:
                self.session.add(
                    InspectionPlanAssignment(
                        plan_id=plan_id,
                        employee_id=employee_id,
                    )
                )

        self.session.add(plan)
        await self.session.commit()

        if plan.id is None:
            return None

        return await self.get_by_id(plan.id)

    async def delete(self, plan_id: int) -> bool:
        plan = await self.get_by_id(plan_id)
        if not plan:
            return False

        await self.session.exec(
            delete(InspectionPlanAssignment).where(InspectionPlanAssignment.plan_id == plan_id)
        )
        await self.session.delete(plan)
        await self.session.commit()
        return True

    async def get_assigned_employee_id(self, plan_id: int) -> int | None:
        assignment = await self._get_assignment(plan_id)
        return assignment.employee_id if assignment else None

    async def find_active_for_employee(self, employee_id: int) -> InspectionPlan | None:
        statement = (
            select(InspectionPlan)
            .join(
                InspectionPlanAssignment,
                InspectionPlanAssignment.plan_id == InspectionPlan.id,
            )
            .join(InspectionPlanStep, InspectionPlanStep.plan_id == InspectionPlan.id)
            .where(
                InspectionPlanAssignment.employee_id == employee_id,
                InspectionPlanStep.completed_at.is_(None),
            )
            .options(
                selectinload(InspectionPlan.equipment_items),
                selectinload(InspectionPlan.steps).selectinload(InspectionPlanStep.equipment),
            )
            .order_by(InspectionPlan.id.desc())
        )
        result = await self.session.exec(statement)
        plans = list(result.all())
        return plans[0] if plans else None

    async def get_next_pending_step(self, plan_id: int) -> InspectionPlanStep | None:
        statement = (
            select(InspectionPlanStep)
            .where(
                InspectionPlanStep.plan_id == plan_id,
                InspectionPlanStep.completed_at.is_(None),
            )
            .options(selectinload(InspectionPlanStep.equipment))
            .order_by(InspectionPlanStep.step_order)
        )
        result = await self.session.exec(statement)
        return result.first()

    async def complete_step(
        self,
        step_id: int,
        inspection_id: int,
    ) -> InspectionPlanStep | None:
        step = await self.session.get(InspectionPlanStep, step_id)
        if not step:
            return None

        step.completed_at = datetime.now(timezone.utc)
        step.completed_inspection_id = inspection_id
        self.session.add(step)
        await self.session.commit()
        await self.session.refresh(step)
        return step

    async def _get_assignment(self, plan_id: int) -> InspectionPlanAssignment | None:
        statement = select(InspectionPlanAssignment).where(
            InspectionPlanAssignment.plan_id == plan_id
        )
        result = await self.session.exec(statement)
        return result.first()

    async def _get_equipment_by_ids(self, equipment_ids: list[int]) -> list[Equipment]:
        statement = select(Equipment).where(Equipment.id.in_(equipment_ids))
        result = await self.session.exec(statement)
        equipment_items = list(result.all())
        equipment_by_id = {equipment.id: equipment for equipment in equipment_items}
        return [
            equipment_by_id[equipment_id]
            for equipment_id in equipment_ids
            if equipment_id in equipment_by_id
        ]

    @staticmethod
    def _unique_equipment_ids(equipment_ids: list[int]) -> list[int]:
        seen: set[int] = set()
        unique_ids: list[int] = []
        for equipment_id in equipment_ids:
            if equipment_id in seen:
                continue
            seen.add(equipment_id)
            unique_ids.append(equipment_id)
        return unique_ids

from app.models import InspectionPlan
from app.repositories.equipment import EquipmentRepository
from app.repositories.inspection_plan import InspectionPlanRepository
from app.schemas.inspection_plan import (
    InspectionPlanCreate,
    InspectionPlanRead,
    InspectionPlanUpdate,
)
from app.services.errors import ServiceError


class InspectionPlanService:
    def __init__(
        self,
        plan_repository: InspectionPlanRepository,
        equipment_repository: EquipmentRepository,
    ) -> None:
        self.plan_repository = plan_repository
        self.equipment_repository = equipment_repository

    async def create(self, payload: InspectionPlanCreate) -> InspectionPlanRead:
        await self._assert_equipment_exists(payload.equipment_ids)
        created = await self.plan_repository.create(
            payload.model_dump(exclude={"equipment_ids"}),
            payload.equipment_ids,
        )
        return await self._to_read_model(created)

    async def list(self) -> list[InspectionPlanRead]:
        items = await self.plan_repository.list()
        return [await self._to_read_model(item) for item in items]

    async def get(self, plan_id: int) -> InspectionPlanRead:
        item = await self.plan_repository.get_by_id(plan_id)
        if not item:
            raise ServiceError("Inspection plan not found", status_code=404)
        return await self._to_read_model(item)

    async def update(self, plan_id: int, payload: InspectionPlanUpdate) -> InspectionPlanRead:
        current = await self.plan_repository.get_by_id(plan_id)
        if not current:
            raise ServiceError("Inspection plan not found", status_code=404)

        data = payload.model_dump(exclude_unset=True)
        equipment_ids = data.pop("equipment_ids", None)
        if equipment_ids is not None:
            await self._assert_equipment_exists(equipment_ids)

        updated = await self.plan_repository.update(plan_id, data, equipment_ids)
        if not updated:
            raise ServiceError("Inspection plan not found", status_code=404)
        return await self._to_read_model(updated)

    async def delete(self, plan_id: int) -> None:
        deleted = await self.plan_repository.delete(plan_id)
        if not deleted:
            raise ServiceError("Inspection plan not found", status_code=404)

    async def _assert_equipment_exists(self, equipment_ids: list[int]) -> None:
        if not equipment_ids:
            raise ServiceError("At least one equipment_id is required", status_code=400)

        missing_ids = [
            equipment_id
            for equipment_id in equipment_ids
            if not await self.equipment_repository.get_by_id(equipment_id)
        ]
        if missing_ids:
            raise ServiceError(
                f"Unknown equipment ids: {missing_ids}",
                status_code=400,
            )

    async def _to_read_model(self, entity: InspectionPlan) -> InspectionPlanRead:
        if entity.id is None:
            raise ServiceError("Inspection plan ID is missing", status_code=500)

        equipment_ids = await self.plan_repository.get_equipment_ids(entity.id)
        return InspectionPlanRead(
            id=entity.id,
            timestamp=entity.timestamp,
            observations=entity.observations,
            score=entity.score,
            supervisor_follow_up=entity.supervisor_follow_up,
            equipment_ids=equipment_ids,
        )

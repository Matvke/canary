from app.repositories.employee import EmployeeRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.inspection import InspectionRepository
from app.repositories.inspection_plan import InspectionPlanRepository
from app.schemas.inspection import InspectionCreate, InspectionRead, InspectionUpdate
from app.services.errors import ServiceError


class InspectionService:
    def __init__(
        self,
        inspection_repository: InspectionRepository,
        equipment_repository: EquipmentRepository,
        employee_repository: EmployeeRepository,
        inspection_plan_repository: InspectionPlanRepository,
    ) -> None:
        self.inspection_repository = inspection_repository
        self.equipment_repository = equipment_repository
        self.employee_repository = employee_repository
        self.inspection_plan_repository = inspection_plan_repository

    async def create(self, payload: InspectionCreate) -> InspectionRead:
        await self._assert_related_entities_exist(payload.equipment_id, payload.employee_id)

        step_id: int | None = None
        if payload.inspection_plan_id is not None:
            step_id = await self._assert_plan_allows_inspection(payload)

        created = await self.inspection_repository.create(
            payload.model_dump(exclude={"inspection_plan_id"})
        )

        if step_id is not None:
            if created.id is None:
                raise ServiceError("Failed to persist inspection", status_code=500)
            completed = await self.inspection_plan_repository.complete_step(step_id, created.id)
            if not completed:
                raise ServiceError("Failed to update inspection plan step", status_code=500)

        return InspectionRead.model_validate(created)

    async def list(self) -> list[InspectionRead]:
        items = await self.inspection_repository.list()
        return [InspectionRead.model_validate(item) for item in items]

    async def get(self, inspection_id: int) -> InspectionRead:
        item = await self.inspection_repository.get_by_id(inspection_id)
        if not item:
            raise ServiceError("Inspection not found", status_code=404)
        return InspectionRead.model_validate(item)

    async def update(self, inspection_id: int, payload: InspectionUpdate) -> InspectionRead:
        current = await self.inspection_repository.get_by_id(inspection_id)
        if not current:
            raise ServiceError("Inspection not found", status_code=404)

        data = payload.model_dump(exclude_unset=True)
        equipment_id = data.get("equipment_id", current.equipment_id)
        employee_id = data.get("employee_id", current.employee_id)
        await self._assert_related_entities_exist(equipment_id, employee_id)

        updated = await self.inspection_repository.update(inspection_id, data)
        if not updated:
            raise ServiceError("Inspection not found", status_code=404)
        return InspectionRead.model_validate(updated)

    async def delete(self, inspection_id: int) -> None:
        deleted = await self.inspection_repository.delete(inspection_id)
        if not deleted:
            raise ServiceError("Inspection not found", status_code=404)

    async def _assert_related_entities_exist(self, equipment_id: int, employee_id: int) -> None:
        if not await self.equipment_repository.get_by_id(equipment_id):
            raise ServiceError("Equipment for inspection was not found", status_code=400)
        if not await self.employee_repository.get_by_id(employee_id):
            raise ServiceError("Employee for inspection was not found", status_code=400)

    async def _assert_plan_allows_inspection(self, payload: InspectionCreate) -> int:
        if payload.inspection_plan_id is None:
            raise ServiceError("Inspection plan ID is required", status_code=400)

        plan = await self.inspection_plan_repository.get_by_id(payload.inspection_plan_id)
        if not plan:
            raise ServiceError("Inspection plan not found", status_code=404)

        assigned_employee_id = await self.inspection_plan_repository.get_assigned_employee_id(plan.id or 0)
        if assigned_employee_id is None:
            raise ServiceError(
                "This inspection plan is not assigned to an employee",
                status_code=400,
            )
        if assigned_employee_id != payload.employee_id:
            raise ServiceError(
                "This inspection plan is assigned to another employee",
                status_code=400,
            )

        next_step = await self.inspection_plan_repository.get_next_pending_step(payload.inspection_plan_id)
        if not next_step:
            raise ServiceError("This inspection plan is already completed", status_code=400)

        if next_step.equipment_id != payload.equipment_id:
            raise ServiceError(
                "Inspection order violation: expected equipment "
                f"{next_step.equipment_id}, got {payload.equipment_id}",
                status_code=400,
            )

        if next_step.id is None:
            raise ServiceError("Inspection plan step ID is missing", status_code=500)

        return next_step.id

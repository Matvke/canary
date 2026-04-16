from app.models import Employee
from app.repositories.employee import EmployeeRepository
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.services.errors import ServiceError


class EmployeeService:
    def __init__(self, repository: EmployeeRepository) -> None:
        self.repository = repository

    async def create(self, payload: EmployeeCreate) -> EmployeeRead:
        created = await self.repository.create(payload.model_dump())
        return await self._to_read_model(created)

    async def list(self) -> list[EmployeeRead]:
        items = await self.repository.list()
        return [await self._to_read_model(item) for item in items]

    async def get(self, employee_id: int) -> EmployeeRead:
        item = await self.repository.get_by_id(employee_id)
        if not item:
            raise ServiceError("Employee not found", status_code=404)
        return await self._to_read_model(item)

    async def update(self, employee_id: int, payload: EmployeeUpdate) -> EmployeeRead:
        existing = await self.repository.get_by_id(employee_id)
        if not existing:
            raise ServiceError("Employee not found", status_code=404)

        updated = await self.repository.update(
            employee_id,
            payload.model_dump(exclude_unset=True),
        )
        if not updated:
            raise ServiceError("Employee not found", status_code=404)
        return await self._to_read_model(updated)

    async def delete(self, employee_id: int) -> None:
        deleted = await self.repository.delete(employee_id)
        if not deleted:
            raise ServiceError("Employee not found", status_code=404)

    async def _to_read_model(self, entity: Employee) -> EmployeeRead:
        if entity.id is None:
            raise ServiceError("Employee ID is missing", status_code=500)

        inspection_ids = await self.repository.get_inspection_ids(entity.id)
        return EmployeeRead(
            id=entity.id,
            name=entity.name,
            role=entity.role,
            inspection_ids=inspection_ids,
        )

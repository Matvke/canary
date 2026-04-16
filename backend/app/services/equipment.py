from app.models import Equipment
from app.repositories.equipment import EquipmentRepository
from app.schemas.equipment import EquipmentCreate, EquipmentRead, EquipmentUpdate
from app.services.errors import ServiceError


class EquipmentService:
    def __init__(self, repository: EquipmentRepository) -> None:
        self.repository = repository

    async def create(self, payload: EquipmentCreate) -> EquipmentRead:
        created = await self.repository.create(payload.model_dump())
        return await self._to_read_model(created)

    async def list(self) -> list[EquipmentRead]:
        items = await self.repository.list()
        return [await self._to_read_model(item) for item in items]

    async def get(self, equipment_id: int) -> EquipmentRead:
        item = await self.repository.get_by_id(equipment_id)
        if not item:
            raise ServiceError("Equipment not found", status_code=404)
        return await self._to_read_model(item)

    async def update(self, equipment_id: int, payload: EquipmentUpdate) -> EquipmentRead:
        existing = await self.repository.get_by_id(equipment_id)
        if not existing:
            raise ServiceError("Equipment not found", status_code=404)

        updated = await self.repository.update(
            equipment_id,
            payload.model_dump(exclude_unset=True),
        )
        if not updated:
            raise ServiceError("Equipment not found", status_code=404)
        return await self._to_read_model(updated)

    async def delete(self, equipment_id: int) -> None:
        deleted = await self.repository.delete(equipment_id)
        if not deleted:
            raise ServiceError("Equipment not found", status_code=404)

    async def _to_read_model(self, entity: Equipment) -> EquipmentRead:
        if entity.id is None:
            raise ServiceError("Equipment ID is missing", status_code=500)

        inspection_ids = await self.repository.get_inspection_ids(entity.id)
        return EquipmentRead(
            id=entity.id,
            name=entity.name,
            description=entity.description,
            status=entity.status,
            inspection_ids=inspection_ids,
        )

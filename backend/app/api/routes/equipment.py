from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db_session
from app.repositories.equipment import EquipmentRepository
from app.schemas.equipment import EquipmentCreate, EquipmentRead, EquipmentUpdate
from app.services.equipment import EquipmentService
from app.services.errors import ServiceError

router = APIRouter()


def get_service(session: AsyncSession = Depends(get_db_session)) -> EquipmentService:
    return EquipmentService(EquipmentRepository(session))


@router.post("/", response_model=EquipmentRead, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    payload: EquipmentCreate,
    service: EquipmentService = Depends(get_service),
) -> EquipmentRead:
    return await service.create(payload)


@router.get("/", response_model=list[EquipmentRead])
async def list_equipment(service: EquipmentService = Depends(get_service)) -> list[EquipmentRead]:
    return await service.list()


@router.get("/{equipment_id}", response_model=EquipmentRead)
async def get_equipment(
    equipment_id: int,
    service: EquipmentService = Depends(get_service),
) -> EquipmentRead:
    try:
        return await service.get(equipment_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.patch("/{equipment_id}", response_model=EquipmentRead)
async def update_equipment(
    equipment_id: int,
    payload: EquipmentUpdate,
    service: EquipmentService = Depends(get_service),
) -> EquipmentRead:
    try:
        return await service.update(equipment_id, payload)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.delete("/{equipment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_equipment(
    equipment_id: int,
    service: EquipmentService = Depends(get_service),
) -> Response:
    try:
        await service.delete(equipment_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)

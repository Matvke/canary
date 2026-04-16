from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db_session
from app.repositories.employee import EmployeeRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.inspection import InspectionRepository
from app.schemas.inspection import InspectionCreate, InspectionRead, InspectionUpdate
from app.services.errors import ServiceError
from app.services.inspection import InspectionService

router = APIRouter()


def get_service(session: AsyncSession = Depends(get_db_session)) -> InspectionService:
    return InspectionService(
        inspection_repository=InspectionRepository(session),
        equipment_repository=EquipmentRepository(session),
        employee_repository=EmployeeRepository(session),
    )


@router.post("/", response_model=InspectionRead, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: InspectionCreate,
    service: InspectionService = Depends(get_service),
) -> InspectionRead:
    try:
        return await service.create(payload)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/", response_model=list[InspectionRead])
async def list_inspections(service: InspectionService = Depends(get_service)) -> list[InspectionRead]:
    return await service.list()


@router.get("/{inspection_id}", response_model=InspectionRead)
async def get_inspection(
    inspection_id: int,
    service: InspectionService = Depends(get_service),
) -> InspectionRead:
    try:
        return await service.get(inspection_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.patch("/{inspection_id}", response_model=InspectionRead)
async def update_inspection(
    inspection_id: int,
    payload: InspectionUpdate,
    service: InspectionService = Depends(get_service),
) -> InspectionRead:
    try:
        return await service.update(inspection_id, payload)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.delete("/{inspection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspection(
    inspection_id: int,
    service: InspectionService = Depends(get_service),
) -> Response:
    try:
        await service.delete(inspection_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)

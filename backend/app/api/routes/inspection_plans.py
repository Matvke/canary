from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db_session
from app.repositories.employee import EmployeeRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.inspection_plan import InspectionPlanRepository
from app.schemas.inspection_plan import (
    InspectionPlanCreate,
    InspectionPlanRead,
    InspectionPlanUpdate,
)
from app.services.errors import ServiceError
from app.services.inspection_plan import InspectionPlanService

router = APIRouter()


def get_service(
    session: AsyncSession = Depends(get_db_session),
) -> InspectionPlanService:
    return InspectionPlanService(
        plan_repository=InspectionPlanRepository(session),
        equipment_repository=EquipmentRepository(session),
        employee_repository=EmployeeRepository(session),
    )


@router.post("/", response_model=InspectionPlanRead, status_code=status.HTTP_201_CREATED)
async def create_inspection_plan(
    payload: InspectionPlanCreate,
    service: InspectionPlanService = Depends(get_service),
) -> InspectionPlanRead:
    try:
        return await service.create(payload)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post(
    "/generate/{employee_id}",
    response_model=InspectionPlanRead,
    status_code=status.HTTP_201_CREATED,
)
async def generate_inspection_plan_for_employee(
    employee_id: int,
    service: InspectionPlanService = Depends(get_service),
) -> InspectionPlanRead:
    try:
        return await service.generate_for_employee(employee_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/employee/{employee_id}/active", response_model=InspectionPlanRead)
async def get_active_inspection_plan_for_employee(
    employee_id: int,
    service: InspectionPlanService = Depends(get_service),
) -> InspectionPlanRead:
    try:
        return await service.get_or_generate_for_employee(employee_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/", response_model=list[InspectionPlanRead])
async def list_inspection_plans(
    service: InspectionPlanService = Depends(get_service),
) -> list[InspectionPlanRead]:
    return await service.list()


@router.get("/{plan_id}", response_model=InspectionPlanRead)
async def get_inspection_plan(
    plan_id: int,
    service: InspectionPlanService = Depends(get_service),
) -> InspectionPlanRead:
    try:
        return await service.get(plan_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.patch("/{plan_id}", response_model=InspectionPlanRead)
async def update_inspection_plan(
    plan_id: int,
    payload: InspectionPlanUpdate,
    service: InspectionPlanService = Depends(get_service),
) -> InspectionPlanRead:
    try:
        return await service.update(plan_id, payload)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inspection_plan(
    plan_id: int,
    service: InspectionPlanService = Depends(get_service),
) -> Response:
    try:
        await service.delete(plan_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)

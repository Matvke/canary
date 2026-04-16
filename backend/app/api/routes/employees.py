from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db_session
from app.repositories.employee import EmployeeRepository
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.services.employee import EmployeeService
from app.services.errors import ServiceError

router = APIRouter()


def get_service(session: AsyncSession = Depends(get_db_session)) -> EmployeeService:
    return EmployeeService(EmployeeRepository(session))


@router.post("/", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    service: EmployeeService = Depends(get_service),
) -> EmployeeRead:
    return await service.create(payload)


@router.get("/", response_model=list[EmployeeRead])
async def list_employees(service: EmployeeService = Depends(get_service)) -> list[EmployeeRead]:
    return await service.list()


@router.get("/{employee_id}", response_model=EmployeeRead)
async def get_employee(
    employee_id: int,
    service: EmployeeService = Depends(get_service),
) -> EmployeeRead:
    try:
        return await service.get(employee_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.patch("/{employee_id}", response_model=EmployeeRead)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    service: EmployeeService = Depends(get_service),
) -> EmployeeRead:
    try:
        return await service.update(employee_id, payload)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(
    employee_id: int,
    service: EmployeeService = Depends(get_service),
) -> Response:
    try:
        await service.delete(employee_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)

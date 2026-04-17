from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db_session
from app.repositories.employee import EmployeeRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.inspection import InspectionRepository
from app.schemas.inspection import InspectionCreate, InspectionRead, InspectionUpdate
from app.services.errors import ServiceError
from app.services.inspection import InspectionService

router = APIRouter()
templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[2] / "templates")
)


def get_service(session: AsyncSession = Depends(get_db_session)) -> InspectionService:
    return InspectionService(
        inspection_repository=InspectionRepository(session),
        equipment_repository=EquipmentRepository(session),
        employee_repository=EmployeeRepository(session),
    )


async def get_inspection_payload(
    request: Request,
    equipment_id: int | None = Form(default=None),
    employee_id: int | None = Form(default=None),
    temperature: float | None = Form(default=None),
    pressure: float | None = Form(default=None),
    vibration: float | None = Form(default=None),
    score: int | None = Form(default=None),
    photo_url: str | None = Form(default=None),
) -> InspectionCreate:
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        body = await request.json()
        return InspectionCreate.model_validate(body)

    return InspectionCreate(
        equipment_id=equipment_id,
        employee_id=employee_id,
        temperature=temperature,
        pressure=pressure,
        vibration=vibration,
        score=score,
        photo_url=photo_url,
    )


@router.get("/form", response_class=HTMLResponse)
async def create_inspection_form(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        request=request,
        name="inspection_create.html",
        context={},
    )


@router.post("/", response_model=InspectionRead, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: InspectionCreate = Depends(get_inspection_payload),
    service: InspectionService = Depends(get_service),
) -> InspectionRead:
    try:
        return await service.create(payload)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/", response_model=list[InspectionRead])
async def list_inspections(
    service: InspectionService = Depends(get_service),
) -> list[InspectionRead]:
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

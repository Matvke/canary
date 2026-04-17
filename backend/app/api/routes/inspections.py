from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlmodel.ext.asyncio.session import AsyncSession
from starlette.datastructures import UploadFile

from app.api.deps import get_db_session
from app.repositories.employee import EmployeeRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.inspection import InspectionRepository
from app.repositories.inspection_plan import InspectionPlanRepository
from app.schemas.inspection import InspectionCreate, InspectionRead, InspectionUpdate
from app.services.errors import ServiceError
from app.services.inspection import InspectionService
from app.services.inspection_plan import InspectionPlanService

router = APIRouter()
templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[2] / "templates")
)
uploads_dir = Path(__file__).resolve().parents[3] / "uploads"


def get_service(session: AsyncSession = Depends(get_db_session)) -> InspectionService:
    return InspectionService(
        inspection_repository=InspectionRepository(session),
        equipment_repository=EquipmentRepository(session),
        employee_repository=EmployeeRepository(session),
        inspection_plan_repository=InspectionPlanRepository(session),
    )


def get_plan_service(
    session: AsyncSession = Depends(get_db_session),
) -> InspectionPlanService:
    return InspectionPlanService(
        plan_repository=InspectionPlanRepository(session),
        equipment_repository=EquipmentRepository(session),
        employee_repository=EmployeeRepository(session),
    )


async def get_inspection_payload(request: Request) -> InspectionCreate:
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        body = await request.json()
        return InspectionCreate.model_validate(body)

    form = await request.form()
    photo_url = form.get("photo_url")
    photo_file = form.get("photo")

    if isinstance(photo_file, UploadFile) and photo_file.filename:
        if not (photo_file.content_type or "").startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file must be an image")

        uploads_dir.mkdir(parents=True, exist_ok=True)
        extension = Path(photo_file.filename).suffix or ".jpg"
        filename = f"{uuid4().hex}{extension}"
        file_path = uploads_dir / filename
        file_path.write_bytes(await photo_file.read())
        await photo_file.close()
        photo_url = f"/uploads/{filename}"

    payload = {
        "equipment_id": form.get("equipment_id"),
        "employee_id": form.get("employee_id"),
        "inspection_plan_id": form.get("inspection_plan_id"),
        "temperature": form.get("temperature"),
        "pressure": form.get("pressure"),
        "vibration": form.get("vibration"),
        "score": form.get("score"),
        "photo_url": photo_url or None,
    }
    return InspectionCreate.model_validate(payload)


@router.get("/form", response_class=HTMLResponse)
async def create_inspection_form(
    request: Request,
    employee_id: int | None = None,
    service: InspectionPlanService = Depends(get_plan_service),
) -> HTMLResponse:
    context: dict[str, object] = {
        "employee_id": employee_id,
        "plan": None,
        "next_step": None,
        "form_error": None,
    }

    if employee_id is not None:
        try:
            plan = await service.get_or_generate_for_employee(employee_id)
            context["plan"] = plan
            context["next_step"] = next(
                (step for step in plan.steps if not step.is_completed),
                None,
            )
        except ServiceError as exc:
            context["form_error"] = exc.message

    return templates.TemplateResponse(
        request=request,
        name="inspection_create.html",
        context=context,
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

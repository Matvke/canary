import json
from datetime import UTC, date, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.api.deps import get_db_session
from app.models import Employee, Equipment, Inspection, InspectionResult, UploadedPhoto
from app.repositories.employee import EmployeeRepository
from app.repositories.equipment import EquipmentRepository
from app.repositories.inspection_plan import InspectionPlanRepository
from app.schemas.pwa import (
    InspectionPlanChecklist,
    InspectionPlanChecklistItem,
    InspectionPlanChecklistOption,
    InspectionPlanChecklistRange,
    InspectionPlanTodayItem,
    InspectionPlanTodayResponse,
    InspectionResultSubmitRequest,
    InspectionResultSubmitResponse,
    UploadPhotoResponse,
)
from app.services.errors import ServiceError
from app.services.inspection_plan import InspectionPlanService

router = APIRouter()
uploads_dir = Path(__file__).resolve().parents[3] / "uploads"


def get_plan_service(
    session: AsyncSession = Depends(get_db_session),
) -> InspectionPlanService:
    return InspectionPlanService(
        plan_repository=InspectionPlanRepository(session),
        equipment_repository=EquipmentRepository(session),
        employee_repository=EmployeeRepository(session),
    )


def _expected_qr_code(equipment_id: int) -> str:
    return f"CANARY-EQ-{equipment_id}"


def _priority_by_status(status: str) -> str:
    return {
        "broken": "high",
        "out_of_service": "high",
        "maintenance": "medium",
        "operational": "low",
    }.get(status, "medium")


def _parse_iso_datetime(raw: str | None) -> datetime | None:
    if not raw:
        return None
    normalized = raw.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


def _get_template_id(equipment_name: str) -> str:
    name = equipment_name.lower()
    if "pump" in name or "насос" in name:
        return "pump-station"
    return "generic-station"


def _get_checklist_template(template_id: str) -> InspectionPlanChecklist:
    if template_id == "pump-station":
        return InspectionPlanChecklist(
            id="pump-station",
            name="Насосная станция",
            version=1,
            items=[
                InspectionPlanChecklistItem(
                    id="temperature",
                    label="Температура корпуса",
                    type="number",
                    required=True,
                    range=InspectionPlanChecklistRange(min=15, max=90, unit="°C"),
                    placeholder="Введите значение",
                ),
                InspectionPlanChecklistItem(
                    id="pressure",
                    label="Давление",
                    type="number",
                    required=True,
                    range=InspectionPlanChecklistRange(min=0, max=15, unit="bar"),
                ),
                InspectionPlanChecklistItem(
                    id="vibration",
                    label="Вибрация",
                    type="number",
                    required=True,
                    range=InspectionPlanChecklistRange(min=0, max=10, unit="mm/s"),
                ),
                InspectionPlanChecklistItem(
                    id="lubrication",
                    label="Смазка",
                    type="select",
                    required=True,
                    options=[
                        InspectionPlanChecklistOption(value="ok", label="Норма"),
                        InspectionPlanChecklistOption(
                            value="low", label="Низкий уровень"
                        ),
                    ],
                ),
                InspectionPlanChecklistItem(
                    id="leak",
                    label="Есть подтек",
                    type="boolean",
                    required=True,
                ),
                InspectionPlanChecklistItem(
                    id="comment",
                    label="Комментарий",
                    type="text",
                    required=False,
                ),
            ],
        )

    return InspectionPlanChecklist(
        id="generic-station",
        name="Общий осмотр",
        version=1,
        items=[
            InspectionPlanChecklistItem(
                id="temperature",
                label="Температура",
                type="number",
                required=True,
            ),
            InspectionPlanChecklistItem(
                id="pressure",
                label="Давление",
                type="number",
                required=True,
            ),
            InspectionPlanChecklistItem(
                id="vibration",
                label="Вибрация",
                type="number",
                required=True,
            ),
            InspectionPlanChecklistItem(
                id="comment",
                label="Комментарий",
                type="text",
                required=False,
            ),
        ],
    )


@router.get("/inspection-plans/today/", response_model=InspectionPlanTodayResponse)
async def get_today_plan(
    employee_id: int = 1,
    service: InspectionPlanService = Depends(get_plan_service),
) -> InspectionPlanTodayResponse:
    try:
        plan = await service.get_or_generate_for_employee(employee_id)
    except ServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc

    items: list[InspectionPlanTodayItem] = []
    for equipment in plan.equipment_items:
        template_id = _get_template_id(equipment.name)
        checklist = _get_checklist_template(template_id)
        status = equipment.status
        items.append(
            InspectionPlanTodayItem(
                id=equipment.id,
                equipmentId=equipment.id,
                name=equipment.name,
                location=equipment.description or "Локация не указана",
                expectedQrCode=_expected_qr_code(equipment.id),
                priority=_priority_by_status(status),
                status=status,
                checklistTemplateId=template_id,
                checklist=checklist,
            )
        )

    return InspectionPlanTodayResponse(
        id=f"plan-{date.today().isoformat()}-employee-{employee_id}",
        date=date.today().isoformat(),
        items=items,
    )


@router.post("/upload-photo", response_model=UploadPhotoResponse)
async def upload_photo(
    file: UploadFile = File(...),
    draft_id: str = Form(...),
    equipment_id: int = Form(...),
    captured_at: str | None = Form(default=None),
    photo_id: str | None = Form(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> UploadPhotoResponse:
    equipment = await session.get(Equipment, equipment_id)
    if not equipment:
        raise HTTPException(status_code=400, detail="Equipment not found")

    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    idempotency_key = photo_id or f"{draft_id}:{file.filename}"
    existing = (
        await session.exec(
            select(UploadedPhoto).where(
                UploadedPhoto.idempotency_key == idempotency_key
            )
        )
    ).first()
    if existing:
        return UploadPhotoResponse(
            id=f"photo-{existing.id}", url=existing.url, photo_url=existing.url
        )

    uploads_dir.mkdir(parents=True, exist_ok=True)
    extension = Path(file.filename or "").suffix or ".jpg"
    filename = f"{uuid4().hex}{extension}"
    target_path = uploads_dir / filename
    target_path.write_bytes(await file.read())
    await file.close()

    url = f"/uploads/{filename}"
    created = UploadedPhoto(
        idempotency_key=idempotency_key,
        photo_id=photo_id,
        draft_id=draft_id,
        equipment_id=equipment_id,
        captured_at=_parse_iso_datetime(captured_at),
        filename=filename,
        url=url,
    )
    session.add(created)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        existing = (
            await session.exec(
                select(UploadedPhoto).where(
                    UploadedPhoto.idempotency_key == idempotency_key
                )
            )
        ).first()
        if existing:
            return UploadPhotoResponse(
                id=f"photo-{existing.id}", url=existing.url, photo_url=existing.url
            )
        raise

    await session.refresh(created)
    return UploadPhotoResponse(id=f"photo-{created.id}", url=url, photo_url=url)


@router.post("/inspection-results", response_model=InspectionResultSubmitResponse)
async def submit_inspection_result(
    payload: InspectionResultSubmitRequest,
    session: AsyncSession = Depends(get_db_session),
) -> InspectionResultSubmitResponse:
    existing = (
        await session.exec(
            select(InspectionResult).where(
                InspectionResult.local_id == payload.local_id
            )
        )
    ).first()
    if existing:
        return InspectionResultSubmitResponse(
            id=f"inspection-result-{existing.id}",
            status="accepted",
            synced_at=existing.synced_at,
        )

    equipment = await session.get(Equipment, payload.equipment_id)
    employee = await session.get(Employee, payload.employee_id)
    if not equipment:
        raise HTTPException(status_code=400, detail="Equipment not found")
    if not employee:
        raise HTTPException(status_code=400, detail="Employee not found")

    expected_qr = _expected_qr_code(payload.equipment_id)
    if payload.qr_code != expected_qr:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "VALIDATION_ERROR",
                "message": "QR code does not match equipment",
                "fields": {"qr_code": f"Expected {expected_qr}"},
                "retryable": False,
            },
        )

    if payload.status == "defect" and not (payload.photo_urls or payload.photo_ids):
        raise HTTPException(
            status_code=400,
            detail="At least one photo is required for defect status",
        )

    checklist = payload.checklist
    temperature = float(checklist.get("temperature", 0))
    pressure = float(checklist.get("pressure", 0))
    vibration = float(checklist.get("vibration", 0))
    score = 100 if payload.status == "ok" else 50
    primary_photo_url = payload.photo_urls[0] if payload.photo_urls else None

    inspection = Inspection(
        equipment_id=payload.equipment_id,
        employee_id=payload.employee_id,
        temperature=temperature,
        pressure=pressure,
        vibration=vibration,
        score=score,
        timestamp=payload.timestamp,
        photo_url=primary_photo_url,
    )
    session.add(inspection)
    await session.flush()

    result = InspectionResult(
        local_id=payload.local_id,
        equipment_id=payload.equipment_id,
        employee_id=payload.employee_id,
        inspector_name=payload.inspector_name,
        status=payload.status,
        qr_code=payload.qr_code,
        scanned_at=payload.scanned_at,
        occurred_at=payload.timestamp,
        checklist_json=json.dumps(payload.checklist, ensure_ascii=False),
        photo_ids_json=json.dumps(payload.photo_ids, ensure_ascii=False),
        photo_urls_json=json.dumps(payload.photo_urls, ensure_ascii=False),
        inspection_id=inspection.id,
    )
    session.add(result)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        existing = (
            await session.exec(
                select(InspectionResult).where(
                    InspectionResult.local_id == payload.local_id
                )
            )
        ).first()
        if existing:
            return InspectionResultSubmitResponse(
                id=f"inspection-result-{existing.id}",
                status="accepted",
                synced_at=existing.synced_at,
            )
        raise

    await session.refresh(result)
    return InspectionResultSubmitResponse(
        id=f"inspection-result-{result.id}",
        status="accepted",
        synced_at=result.synced_at,
    )

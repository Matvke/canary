from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class InspectionPlanChecklistRange(BaseModel):
    min: float | int | None = None
    max: float | int | None = None
    unit: str | None = None


class InspectionPlanChecklistOption(BaseModel):
    value: str
    label: str


class InspectionPlanChecklistItem(BaseModel):
    id: str
    label: str
    type: Literal["number", "select", "boolean", "text"]
    required: bool = True
    hint: str | None = None
    placeholder: str | None = None
    range: InspectionPlanChecklistRange | None = None
    options: list[InspectionPlanChecklistOption] | None = None


class InspectionPlanChecklist(BaseModel):
    id: str
    name: str
    version: int = 1
    items: list[InspectionPlanChecklistItem]


class InspectionPlanTodayItem(BaseModel):
    id: int
    equipmentId: int
    name: str
    location: str
    expectedQrCode: str
    priority: Literal["high", "medium", "low"]
    status: str
    checklistTemplateId: str
    checklist: InspectionPlanChecklist


class InspectionPlanTodayResponse(BaseModel):
    id: str
    date: str
    items: list[InspectionPlanTodayItem]


class UploadPhotoResponse(BaseModel):
    id: str
    url: str
    photo_url: str | None = None


class InspectionResultSubmitRequest(BaseModel):
    local_id: str = Field(min_length=1)
    equipment_id: int
    employee_id: int
    inspector_name: str
    status: Literal["ok", "defect"]
    qr_code: str
    scanned_at: datetime | None = None
    timestamp: datetime
    checklist: dict[str, Any] = Field(default_factory=dict)
    photo_ids: list[str] = Field(default_factory=list)
    photo_urls: list[str] = Field(default_factory=list)

    model_config = ConfigDict(extra="allow")


class InspectionResultSubmitResponse(BaseModel):
    id: str
    status: Literal["accepted"]
    synced_at: datetime


from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


class InspectionPlanBase(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observations: str | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    supervisor_follow_up: bool = False


class InspectionPlanCreate(InspectionPlanBase):
    equipment_ids: list[int] = Field(min_length=1)
    employee_id: int | None = None


class InspectionPlanUpdate(BaseModel):
    timestamp: datetime | None = None
    observations: str | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    supervisor_follow_up: bool | None = None
    equipment_ids: list[int] | None = None
    employee_id: int | None = None


class InspectionPlanEquipmentRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class InspectionPlanStepRead(BaseModel):
    id: int
    step_order: int
    equipment: InspectionPlanEquipmentRead
    completed_at: datetime | None = None
    completed_inspection_id: int | None = None
    is_completed: bool


class InspectionPlanRead(InspectionPlanBase):
    id: int
    employee_id: int | None = None
    equipment_items: list[InspectionPlanEquipmentRead]
    steps: list[InspectionPlanStepRead] = Field(default_factory=list)
    next_equipment_id: int | None = None
    is_completed: bool = False

    model_config = ConfigDict(from_attributes=True)

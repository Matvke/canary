from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


class InspectionPlanBase(BaseModel):
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observations: str | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    supervisor_follow_up: bool = False


class InspectionPlanCreate(InspectionPlanBase):
    equipment_ids: list[int] = Field(min_length=1)


class InspectionPlanUpdate(BaseModel):
    timestamp: datetime | None = None
    observations: str | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    supervisor_follow_up: bool | None = None
    equipment_ids: list[int] | None = None


class InspectionPlanRead(InspectionPlanBase):
    id: int
    equipment_ids: list[int]

    model_config = ConfigDict(from_attributes=True)

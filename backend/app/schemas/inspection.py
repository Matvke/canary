from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field


class InspectionBase(BaseModel):
    equipment_id: int
    employee_id: int
    temperature: float
    pressure: float
    vibration: float
    score: int = Field(ge=0, le=100)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    photo_url: str | None = None


class InspectionCreate(InspectionBase):
    pass


class InspectionUpdate(BaseModel):
    equipment_id: int | None = None
    employee_id: int | None = None
    temperature: float | None = None
    pressure: float | None = None
    vibration: float | None = None
    score: int | None = Field(default=None, ge=0, le=100)
    timestamp: datetime | None = None
    photo_url: str | None = None


class InspectionRead(InspectionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

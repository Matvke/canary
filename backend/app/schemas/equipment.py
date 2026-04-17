from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


EquipmentStatus = Literal["operational", "maintenance", "out_of_service", "broken"]


class EquipmentBase(BaseModel):
    name: str
    description: str | None = None
    status: EquipmentStatus = "operational"


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: EquipmentStatus | None = None


class EquipmentInspectionRead(BaseModel):
    id: int
    equipment_id: int
    employee_id: int
    temperature: float
    pressure: float
    vibration: float
    score: int = Field(ge=0, le=100)
    timestamp: datetime
    photo_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EquipmentRead(EquipmentBase):
    id: int
    inspections: list[EquipmentInspectionRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EmployeeBase(BaseModel):
    name: str
    role: str


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: str | None = None
    role: str | None = None


class EmployeeInspectionRead(BaseModel):
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


class EmployeeRead(EmployeeBase):
    id: int
    inspections: list[EmployeeInspectionRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

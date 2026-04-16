from pydantic import BaseModel, ConfigDict, Field


class EmployeeBase(BaseModel):
    name: str
    role: str


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    name: str | None = None
    role: str | None = None


class EmployeeRead(EmployeeBase):
    id: int
    inspection_ids: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

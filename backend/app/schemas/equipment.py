from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


EquipmentStatus = Literal["operational", "maintenance", "out_of_service"]


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


class EquipmentRead(EquipmentBase):
    id: int
    inspection_ids: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

from datetime import datetime, timezone

from sqlmodel import Field, Relationship, SQLModel


class InspectionPlanEquipmentLink(SQLModel, table=True):
    __tablename__ = "inspection_plan_equipment"

    plan_id: int = Field(foreign_key="inspection_plans.id", primary_key=True)
    equipment_id: int = Field(foreign_key="equipment.id", primary_key=True)


class Equipment(SQLModel, table=True):
    __tablename__ = "equipment"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    description: str | None = None
    status: str = Field(default="operational")

    inspections: list["Inspection"] = Relationship(
        back_populates="equipment",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    inspection_plans: list["InspectionPlan"] = Relationship(
        back_populates="equipment_items",
        link_model=InspectionPlanEquipmentLink,
    )


class Employee(SQLModel, table=True):
    __tablename__ = "employees"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    role: str

    inspections: list["Inspection"] = Relationship(
        back_populates="employee",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Inspection(SQLModel, table=True):
    __tablename__ = "inspections"

    id: int | None = Field(default=None, primary_key=True)
    equipment_id: int = Field(foreign_key="equipment.id", index=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    temperature: float
    pressure: float
    vibration: float
    score: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    photo_url: str | None = None

    equipment: Equipment = Relationship(back_populates="inspections")
    employee: Employee = Relationship(back_populates="inspections")


class InspectionPlan(SQLModel, table=True):
    __tablename__ = "inspection_plans"

    id: int | None = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observations: str | None = None
    score: int | None = None
    supervisor_follow_up: bool = Field(default=False)

    equipment_items: list[Equipment] = Relationship(
        back_populates="inspection_plans",
        link_model=InspectionPlanEquipmentLink,
    )

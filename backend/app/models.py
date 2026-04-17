from datetime import datetime, timezone

from sqlalchemy.orm import Mapped, relationship
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

    inspections: Mapped[list["Inspection"]] = Relationship(
        sa_relationship=relationship(
            "Inspection",
            back_populates="equipment",
            cascade="all, delete-orphan",
        )
    )
    inspection_plans: Mapped[list["InspectionPlan"]] = Relationship(
        sa_relationship=relationship(
            "InspectionPlan",
            back_populates="equipment_items",
            secondary="inspection_plan_equipment",
        )
    )


class Employee(SQLModel, table=True):
    __tablename__ = "employees"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    role: str

    inspections: Mapped[list["Inspection"]] = Relationship(
        sa_relationship=relationship(
            "Inspection",
            back_populates="employee",
            cascade="all, delete-orphan",
        )
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

    equipment: Mapped[Equipment] = Relationship(
        sa_relationship=relationship("Equipment", back_populates="inspections")
    )
    employee: Mapped[Employee] = Relationship(
        sa_relationship=relationship("Employee", back_populates="inspections")
    )


class InspectionPlan(SQLModel, table=True):
    __tablename__ = "inspection_plans"

    id: int | None = Field(default=None, primary_key=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observations: str | None = None
    score: int | None = None
    supervisor_follow_up: bool = Field(default=False)

    equipment_items: Mapped[list["Equipment"]] = Relationship(
        back_populates="inspection_plans",
        link_model=InspectionPlanEquipmentLink,
    )
    steps: Mapped[list["InspectionPlanStep"]] = Relationship(
        back_populates="plan",
        sa_relationship_kwargs={
            "cascade": "all, delete-orphan",
            "order_by": "InspectionPlanStep.step_order",
        },
    )


class InspectionPlanStep(SQLModel, table=True):
    __tablename__ = "inspection_plan_steps"

    id: int | None = Field(default=None, primary_key=True)
    plan_id: int = Field(foreign_key="inspection_plans.id", index=True)
    equipment_id: int = Field(foreign_key="equipment.id", index=True)
    step_order: int = Field(index=True, ge=1)
    completed_at: datetime | None = None
    completed_inspection_id: int | None = Field(
        default=None, foreign_key="inspections.id"
    )

    plan: Mapped["InspectionPlan"] = Relationship(back_populates="steps")
    equipment: Mapped["Equipment"] = Relationship()


class InspectionPlanAssignment(SQLModel, table=True):
    __tablename__ = "inspection_plan_assignments"

    plan_id: int = Field(foreign_key="inspection_plans.id", primary_key=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)


class UploadedPhoto(SQLModel, table=True):
    __tablename__ = "uploaded_photos"

    id: int | None = Field(default=None, primary_key=True)
    idempotency_key: str = Field(index=True, unique=True)
    photo_id: str | None = None
    draft_id: str
    equipment_id: int = Field(foreign_key="equipment.id", index=True)
    captured_at: datetime | None = None
    filename: str
    url: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InspectionResult(SQLModel, table=True):
    __tablename__ = "inspection_results"

    id: int | None = Field(default=None, primary_key=True)
    local_id: str = Field(index=True, unique=True)
    equipment_id: int = Field(foreign_key="equipment.id", index=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    inspector_name: str
    status: str
    qr_code: str
    scanned_at: datetime | None = None
    occurred_at: datetime
    checklist_json: str
    photo_ids_json: str
    photo_urls_json: str
    inspection_id: int | None = Field(default=None, foreign_key="inspections.id")
    synced_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

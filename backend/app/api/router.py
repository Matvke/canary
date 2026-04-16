from fastapi import APIRouter

from app.api.routes import employees, equipment, inspection_plans, inspections

api_router = APIRouter()
api_router.include_router(equipment.router, prefix="/equipment", tags=["Equipment"])
api_router.include_router(inspections.router, prefix="/inspections", tags=["Inspections"])
api_router.include_router(
    inspection_plans.router,
    prefix="/inspection-plans",
    tags=["Inspection Plans"],
)
api_router.include_router(employees.router, prefix="/employees", tags=["Employees"])

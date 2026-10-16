from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    audit,
    academics,
    students,
    staff,
    fees,
    examinations,
    attendance,
    parent_portal,
    student_portal,
    notices,
    dashboard,
    reports,
)

api_router = APIRouter()

# Phase 1 Routers
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(audit.router)

# Phase 2 Routers
api_router.include_router(academics.router)
api_router.include_router(students.router)
api_router.include_router(staff.router)

# Phase 3 Routers
api_router.include_router(fees.router)

# Phase 4 Routers
api_router.include_router(examinations.router)

# Phase 5 Routers
api_router.include_router(attendance.router)

# Phase 6 Routers
api_router.include_router(parent_portal.router)
api_router.include_router(student_portal.router)

# Phase 7 Routers
api_router.include_router(notices.router)
api_router.include_router(dashboard.router)
api_router.include_router(reports.router)

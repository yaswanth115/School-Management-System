from enum import Enum
from typing import Dict, List


class RoleEnum(str, Enum):
    ADMIN = "ADMIN"
    PRINCIPAL = "PRINCIPAL"
    ACCOUNTANT = "ACCOUNTANT"
    TEACHER = "TEACHER"
    PARENT = "PARENT"
    STUDENT = "STUDENT"


# Permission catalog mapping roles to granular permission keys
ROLE_PERMISSIONS: Dict[RoleEnum, List[str]] = {
    RoleEnum.ADMIN: [
        "users:read", "users:create", "users:update", "users:delete",
        "academics:manage", "students:manage", "fees:manage",
        "exams:manage", "attendance:manage", "reports:view_all",
        "notices:manage", "audit:view", "settings:manage",
    ],
    RoleEnum.PRINCIPAL: [
        "academics:read", "students:read", "teachers:read",
        "exams:review", "exams:approve", "exams:publish",
        "attendance:read_all", "reports:academic", "reports:view_all",
        "notices:manage",
    ],
    RoleEnum.ACCOUNTANT: [
        "fees:structure_manage", "fees:invoices_generate", "fees:payments_collect",
        "fees:receipts_generate", "fees:refunds_process", "fees:reports_view",
        "students:read_basic",
    ],
    RoleEnum.TEACHER: [
        "academics:assigned_read", "attendance:mark", "attendance:view_assigned",
        "marks:enter", "marks:submit", "students:read_assigned",
        "timetables:view", "notices:view",
    ],
    RoleEnum.PARENT: [
        "portal:parent", "children:view_profile", "children:view_attendance",
        "children:view_results", "children:view_fees", "children:pay_fees",
        "notices:view",
    ],
    RoleEnum.STUDENT: [
        "portal:student", "self:view_profile", "self:view_attendance",
        "self:view_results", "self:view_fees", "self:view_timetable",
        "notices:view",
    ],
}

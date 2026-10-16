# School Management System

A unified, responsive web and mobile-ready School Management System designed for educational institutions to administer admissions, academics, fee operations, examinations, attendance, communications, and institutional reporting.

---

## 1. Architecture & Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, React Router v6, Axios, Lucide Icons | Responsive SPA with Role-Based Access Control and modern UI components |
| **Backend** | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, PyJWT, Bcrypt | High-performance RESTful API with layered architecture under `/api/v1` |
| **Database** | PostgreSQL 16/18 | Relational store with ACID guarantees, decimal currency, and audit trails |
| **Containerization** | Docker, Docker Compose, Multi-stage builds | Standardized environments for local development and Google Cloud Run |

---

## 2. Phase 1 Features Implemented

### 2.1 Backend & Database
- **PostgreSQL 18 Connectivity**: Integrated with local database `school_management_db` and containerized PostgreSQL.
- **SQLAlchemy 2.0 Models**: `User`, `RoleEnum` (`ADMIN`, `PRINCIPAL`, `ACCOUNTANT`, `TEACHER`, `PARENT`, `STUDENT`), `AuditLog`.
- **Alembic Migrations**: Full version-controlled schema migrations (`alembic upgrade head`).
- **Security & JWT**: Salted Bcrypt password hashing, short-lived JWT Access Tokens (30m), and Rotating Refresh Tokens (7d).
- **Role-Based Access Control (RBAC)**: Declarative dependency guards (`require_roles(...)`) securing routes.
- **User Management APIs**:
  - `POST /api/v1/auth/login`: Issue access & refresh tokens
  - `POST /api/v1/auth/refresh`: Refresh expired sessions
  - `GET /api/v1/auth/me`: Authenticated user profile
  - `PUT /api/v1/auth/profile`: Update personal details
  - `POST /api/v1/auth/change-password`: Change password with verification
  - `GET /api/v1/users`: List users with search, role, status filters, and pagination
  - `POST /api/v1/users`: Create new user with duplicate prevention
  - `GET /api/v1/users/{id}`: User details
  - `PUT /api/v1/users/{id}`: Update user information
  - `PATCH /api/v1/users/{id}/status`: Activate/deactivate accounts
  - `GET /api/v1/audit`: Query immutable audit trail logs
- **Seed Script**: Bootstraps all 6 default role accounts and default permissions.
- **Backend Test Suite**: 18 automated tests passing with Pytest covering auth, tokens, RBAC, user CRUD, duplicate checks, and status toggles.

### 2.2 Frontend (React + TypeScript + Tailwind CSS)
- **Responsive Layout**:
  - Collapsible Sidebar with role-filtered menu items
  - Topbar with institution branding, dynamic titles, and user profile dropdown
  - Mobile Drawer navigation for touchscreens and small viewports
- **Reusable UI Component Library**:
  - `Button` (primary, secondary, danger, outline, ghost, loading spinner)
  - `Input` & `Select` (labels, helper text, error messages, icons)
  - `Badge` (semantic colors, role badges, active/inactive indicators)
  - `Card` (standard containers for metrics and content)
  - `Modal` (accessible dialogs with backdrops and escape handling)
  - `Table` (responsive, sortable, paginated with empty & loading states)
  - `Alert` (dismissible notifications: success, error, warning, info)
  - `Spinner` & `EmptyState` (friendly illustrations and feedback)
- **Authentication & State**:
  - `AuthContext` with login, logout, profile update, session refresh, and role checks
  - Axios client with automatic bearer token attachment and 401 refresh interceptor
- **Screens**:
  - `LoginPage` with form validation and 1-click test credential buttons
  - `ForgotPasswordPage`
  - `DashboardPage` dynamically tailored for each role (Admin, Principal, Accountant, Teacher, Parent, Student)
  - `UserListPage` with search, role filters, status toggles, and modal dialogs
  - `AddUserModal` & `EditUserModal`
  - `UserProfilePage` with personal info update and password change
  - `AuditLogPage` displaying system mutation events
  - `NotFoundPage` & `UnauthorizedPage`
  - Upcoming module placeholders for subsequent phases
- **Frontend Test Suite**: 6 tests passing with Vitest covering UI components and login flows.

---

## 3. Seeded Test Credentials

You can log in immediately with any of the pre-configured accounts:

| Role | Email | Password | Scope of Access |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@school.com` | `Admin@12345` | Full system control, user management, audit logs |
| **Principal** | `principal@school.com` | `Principal@12345` | Academic oversight, user read access, results review |
| **Accountant** | `accountant@school.com` | `Accountant@12345` | Billing, fee structures, invoices, payment ledgers |
| **Teacher** | `teacher@school.com` | `Teacher@12345` | Assigned classes, attendance registers, marks entry |
| **Parent** | `parent@school.com` | `Parent@12345` | Linked children attendance, report cards, fees |
| **Student** | `student@school.com` | `Student@12345` | Personal attendance, timetables, published grades |

---

## 4. How to Run Locally

### 4.1 Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 18+ (Node 22/26 tested)
- PostgreSQL 16/18 (Running locally on port 5432 with password `Yash@222`)

### 4.2 Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial roles and accounts
python app/db/seed.py

# Start FastAPI server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- API Base URL: `http://127.0.0.1:8000/api/v1`
- Swagger / OpenAPI Docs: `http://127.0.0.1:8000/api/v1/docs`
- Healthcheck: `http://127.0.0.1:8000/health`

### 4.3 Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
- Frontend application URL: `http://localhost:5173`

---

## 5. Running Automated Tests

### Backend Tests (Pytest)
```bash
cd backend
.venv\Scripts\pytest tests -v
```

### Frontend Tests (Vitest)
```bash
cd frontend
npm run test
```

### Production Build Verification
```bash
cd frontend
npm run build
```

---

## 6. Docker & Docker Compose Setup

To run the entire multi-container stack in Docker:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Database: `localhost:5432`

---

## 7. Project Implementation Roadmap

- [x] **Phase 1: Project setup, PostgreSQL, Docker, authentication, user roles, responsive layout**
- [ ] **Phase 2: Academic years, classes, sections, subjects, and student management**
- [ ] **Phase 3: Fee structures, invoices, payments, receipts, and fee reports**
- [ ] **Phase 4: Examinations, marks entry, approvals, results, and report cards**
- [ ] **Phase 5: Attendance management and reports**
- [ ] **Phase 6: Parent portal and student portal**
- [ ] **Phase 7: Notices, notifications, dashboards, and exports**
- [ ] **Phase 8: Security testing, responsive testing, integration testing, and bug fixes**
- [ ] **Phase 9: Google Cloud staging deployment, verification, and production preparation**

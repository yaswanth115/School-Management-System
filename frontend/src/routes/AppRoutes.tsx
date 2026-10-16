import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Spinner } from '../components/ui/Spinner';

// Layout
import { MainLayout } from '../components/layout/MainLayout';

// Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { UserListPage } from '../pages/users/UserListPage';
import { UserProfilePage } from '../pages/users/UserProfilePage';
import { AuditLogPage } from '../pages/audit/AuditLogPage';
import { NotFoundPage } from '../pages/common/NotFoundPage';
import { UnauthorizedPage } from '../pages/common/UnauthorizedPage';
import { ModulePlaceholderPage } from '../pages/common/ModulePlaceholderPage';

// Phase 2 Pages
import { AcademicManagementPage } from '../pages/academics/AcademicManagementPage';
import { StudentListPage } from '../pages/students/StudentListPage';
import { StudentAdmissionPage } from '../pages/students/StudentAdmissionPage';
import { StudentProfilePage } from '../pages/students/StudentProfilePage';
import { StaffListPage } from '../pages/staff/StaffListPage';

// Phase 3 Pages
import { FeeManagementPage } from '../pages/fees/FeeManagementPage';

// Phase 4 Pages
import { ExaminationManagementPage } from '../pages/examinations/ExaminationManagementPage';

// Phase 5 Pages
import { AttendanceManagementPage } from '../pages/attendance/AttendanceManagementPage';

// Phase 6 Pages
import { ParentPortalPage } from '../pages/parent/ParentPortalPage';
import { StudentPortalPage } from '../pages/student/StudentPortalPage';

// Phase 7 Pages
import { NoticeListPage } from '../pages/notices/NoticeListPage';
import { ReportsPage } from '../pages/reports/ReportsPage';

// Route Guard: Ensures user is authenticated
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" label="Validating security session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Route Guard: Ensures user possesses allowed role
export const RoleRoute: React.FC<{
  allowedRoles: Role[];
  children: React.ReactNode;
}> = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* Protected Application Routes wrapped in MainLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="profile" element={<UserProfilePage />} />

        {/* User Management & Audit (Admin / Principal) */}
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL']}>
              <UserListPage />
            </RoleRoute>
          }
        />
        <Route
          path="audit"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <AuditLogPage />
            </RoleRoute>
          }
        />

        {/* Phase 2: Students, Academics & Staff */}
        <Route
          path="students"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER']}>
              <StudentListPage />
            </RoleRoute>
          }
        />
        <Route
          path="students/admission"
          element={
            <RoleRoute allowedRoles={['ADMIN']}>
              <StudentAdmissionPage />
            </RoleRoute>
          }
        />
        <Route
          path="students/:id"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER']}>
              <StudentProfilePage />
            </RoleRoute>
          }
        />
        <Route
          path="academics"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'TEACHER']}>
              <AcademicManagementPage />
            </RoleRoute>
          }
        />
        <Route
          path="staff"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL']}>
              <StaffListPage />
            </RoleRoute>
          }
        />

        {/* Phase 3: Fee Management */}
        <Route
          path="fees"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'ACCOUNTANT', 'PRINCIPAL', 'STUDENT', 'PARENT']}>
              <FeeManagementPage />
            </RoleRoute>
          }
        />

        {/* Phase 4: Examinations */}
        <Route
          path="examinations"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'TEACHER']}>
              <ExaminationManagementPage />
            </RoleRoute>
          }
        />

        {/* Phase 5: Attendance */}
        <Route
          path="attendance"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'TEACHER']}>
              <AttendanceManagementPage />
            </RoleRoute>
          }
        />

        {/* Phase 6: Parent & Student Portals */}
        <Route
          path="parent/children"
          element={
            <RoleRoute allowedRoles={['PARENT', 'ADMIN']}>
              <ParentPortalPage />
            </RoleRoute>
          }
        />
        <Route
          path="student/profile"
          element={
            <RoleRoute allowedRoles={['STUDENT', 'ADMIN']}>
              <StudentPortalPage />
            </RoleRoute>
          }
        />

        {/* Phase 7: Notices & Reports */}
        <Route
          path="notices"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'ACCOUNTANT', 'TEACHER', 'PARENT', 'STUDENT']}>
              <NoticeListPage />
            </RoleRoute>
          }
        />
        <Route
          path="reports"
          element={
            <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL', 'ACCOUNTANT']}>
              <ReportsPage />
            </RoleRoute>
          }
        />
      </Route>

      {/* Common Fallback Routes */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

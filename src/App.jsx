import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/ui/Toast';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';

// Placeholder Pages for all roles to scaffold routing
const Placeholder = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-full text-slate-500">
    <h2 className="text-2xl font-semibold mb-2">{title}</h2>
    <p>This page is under construction based on the specification.</p>
  </div>
);

const Unauthorized = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-800 p-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-slate-500 mb-8 max-w-md text-sm leading-relaxed">You don't have permission to access this page. If you believe this is a mistake, please contact your administrator.</p>
        <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-indigo-600 text-white rounded-md font-bold hover:bg-indigo-700 transition-colors">Go to My Dashboard</button>
    </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { session, role, loading } = useAuth();
  
  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-white"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { session, role, loading } = useAuth();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  // Map root access based on role
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'hod') return <Navigate to="/hod" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  if (role === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/login" replace />;
};

import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminBranches } from './pages/admin/Branches';
import { BulkUpload } from './pages/admin/BulkUpload';
import { MarksUpload } from './pages/admin/MarksUpload';
import { AdminTimetable } from './pages/admin/Timetable';
import { AdminSubjects } from './pages/admin/Subjects';
import { SemTransition } from './pages/admin/SemTransition';
import { AdminConfig } from './pages/admin/Config';
import { AdminPreferences } from './pages/admin/Preferences';
import { AdminNotices } from './pages/admin/Notices';
import { AdminSystemHealth } from './pages/admin/Health';
import { AdminHolidays } from './pages/admin/Holidays';
import { EmergencyRecovery } from './pages/admin/Recovery';
import { ArchiveSemester } from './pages/admin/ArchiveSemester';
import { BackupFiles } from './pages/admin/BackupFiles';
import { AdminLeaves } from './pages/admin/Leaves';

// Shared
import { Notices } from './pages/shared/Notices';

// HOD
import { HodDashboard } from './pages/hod/Dashboard';
import { HodAttendance } from './pages/hod/Attendance';
import { HodAnalysis } from './pages/hod/Analysis';
import { HodHolidays } from './pages/hod/Holidays';
import { HodEndSemPoll } from './pages/hod/EndSemPoll';
import { HodSubjectAssignment } from './pages/hod/SubjectAssignment';
import { HodLeaveManagement } from './pages/hod/LeaveManagement';
import { HodCondonation } from './pages/hod/Condonation';
import { HodChangeRequests } from './pages/hod/ChangeRequests';

// Teacher
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { MarkAttendance } from './pages/teacher/MarkAttendance';
import { MultiClass } from './pages/teacher/MultiClass';
import { BorrowLecture } from './pages/teacher/BorrowLecture';
import { TeacherLeaveRequest } from './pages/teacher/LeaveRequest';
import { TeacherCondonation } from './pages/teacher/Condonation';
import { TeacherHistory } from './pages/teacher/History';

// Student
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentAttendance } from './pages/student/Attendance';
import { StudentMarks } from './pages/student/Marks';
import { StudentCondonation } from './pages/student/Condonation';
import { StudentEndSem } from './pages/student/EndSem';
import { StudentProfile } from './pages/student/Profile';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RootRedirect />} />

      {/* ADMIN ROUTES */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout showPinboard={false} /></ProtectedRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="branches" element={<AdminBranches />} />
        <Route path="bulk-upload" element={<BulkUpload />} />
        <Route path="marks-upload" element={<MarksUpload />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="subjects" element={<AdminSubjects />} />
        <Route path="sem-transition" element={<SemTransition />} />
        <Route path="config" element={<AdminConfig />} />
        <Route path="preferences" element={<AdminPreferences />} />
        <Route path="notices" element={<AdminNotices />} />
        <Route path="health" element={<AdminSystemHealth />} />
        <Route path="holidays" element={<AdminHolidays />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="recovery" element={<EmergencyRecovery />} />
        <Route path="archive-semester" element={<ArchiveSemester />} />
        <Route path="backups" element={<BackupFiles />} />
      </Route>

      {/* HOD ROUTES */}
      <Route path="/hod" element={<ProtectedRoute allowedRoles={['hod']}><Layout showPinboard={true} /></ProtectedRoute>}>
        <Route index element={<HodDashboard />} />
        <Route path="attendance" element={<HodAttendance />} />
        <Route path="analysis" element={<HodAnalysis />} />
        <Route path="holidays" element={<HodHolidays />} />
        <Route path="end-sem-poll" element={<HodEndSemPoll />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="subjects" element={<HodSubjectAssignment />} />
        <Route path="leave-management" element={<HodLeaveManagement />} />
        <Route path="condonation" element={<HodCondonation />} />
        <Route path="change-requests" element={<HodChangeRequests />} />
        <Route path="notices" element={<Notices />} />
      </Route>

      {/* TEACHER ROUTES */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><Layout showPinboard={true} /></ProtectedRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="mark-attendance" element={<MarkAttendance />} />
        <Route path="multi-class" element={<MultiClass />} />
        <Route path="borrow" element={<BorrowLecture />} />
        <Route path="leave-request" element={<TeacherLeaveRequest />} />
        <Route path="condonation" element={<TeacherCondonation />} />
        <Route path="history" element={<TeacherHistory />} />
        <Route path="timetable" element={<AdminTimetable />} />
        <Route path="notices" element={<Notices />} />
      </Route>

      {/* STUDENT ROUTES */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><Layout showPinboard={true} /></ProtectedRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="marks" element={<StudentMarks />} />
        <Route path="condonation" element={<StudentCondonation />} />
        <Route path="end-sem" element={<StudentEndSem />} />
        <Route path="notices" element={<Notices />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

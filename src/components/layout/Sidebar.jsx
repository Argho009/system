import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../ui/Button';
import { 
  Users, Upload, Calendar, Settings, FileText, 
  CheckSquare, Activity, Send, Clock, BookOpen, UserCircle, Bell, Landmark, ShieldAlert, ArchiveX, HardDrive
} from 'lucide-react';

const ADMIN_LINKS = [
  { to: '/admin', icon: Activity, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/branches', icon: Landmark, label: 'Branches' },
  { to: '/admin/bulk-upload', icon: Upload, label: 'Bulk Upload' },
  { to: '/admin/marks-upload', icon: Upload, label: 'Marks Upload' },
  { to: '/admin/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/admin/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/admin/sem-transition', icon: Send, label: 'Sem Transition' },
  { to: '/admin/config', icon: Settings, label: 'Config' },
  { to: '/admin/preferences', icon: Settings, label: 'Preferences' },
  { to: '/admin/notices', icon: Bell, label: 'Notices' },
  { to: '/admin/holidays', icon: Calendar, label: 'Holidays' },
  { to: '/admin/recovery', icon: ShieldAlert, label: 'Recovery' },
  { to: '/admin/archive-semester', icon: ArchiveX, label: 'Archive Semester' },
  { to: '/admin/backups', icon: HardDrive, label: 'Backup Files' },
];

const HOD_LINKS = [
  { to: '/hod', icon: Activity, label: 'Dashboard' },
  { to: '/hod/attendance', icon: CheckSquare, label: 'Attendance' },
  { to: '/hod/analysis', icon: Activity, label: 'Marks Analysis' },
  { to: '/hod/holidays', icon: Calendar, label: 'Holidays' },
  { to: '/hod/end-sem-poll', icon: FileText, label: 'End Sem Poll' },
  { to: '/hod/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/hod/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/hod/leave-management', icon: Clock, label: 'Leave Mgmt', badge: 'emergency' },
  { to: '/hod/condonation', icon: FileText, label: 'Condonation' },
  { to: '/hod/change-requests', icon: Send, label: 'Change Requests' },
  { to: '/hod/notices', icon: Bell, label: 'Notices' },
];

const TEACHER_LINKS = [
  { to: '/teacher', icon: Activity, label: 'Dashboard' },
  { to: '/teacher/mark-attendance', icon: CheckSquare, label: 'Mark Attendance' },
  { to: '/teacher/multi-class', icon: CheckSquare, label: 'Multi-Class' },
  { to: '/teacher/borrow', icon: Send, label: 'Borrow Lecture' },
  { to: '/teacher/leave-request', icon: Clock, label: 'Leave Request' },
  { to: '/teacher/condonation', icon: FileText, label: 'Condonation' },
  { to: '/teacher/history', icon: Clock, label: 'History' },
  { to: '/teacher/my-schedule', icon: Calendar, label: 'My Schedule' },
  { to: '/teacher/manual-init', icon: Clock, label: 'Manual Balance' },
  { to: '/teacher/notices', icon: Bell, label: 'Notices' },
];

const STUDENT_LINKS = [
  { to: '/student', icon: Activity, label: 'Dashboard' },
  { to: '/student/attendance', icon: CheckSquare, label: 'My Attendance' },
  { to: '/student/marks', icon: FileText, label: 'My Marks' },
  { to: '/student/condonation', icon: FileText, label: 'Condonation' },
  { to: '/student/end-sem', icon: Upload, label: 'End Sem' },
  { to: '/student/timetable', icon: Calendar, label: 'My Timetable' },
  { to: '/student/notices', icon: Bell, label: 'Notices' },

  { to: '/student/profile', icon: UserCircle, label: 'Profile' },
];

export const Sidebar = () => {
  const { role } = useAuth();

  let links = [];
  if (role === 'admin') links = ADMIN_LINKS;
  else if (role === 'hod') links = HOD_LINKS;
  else if (role === 'teacher') links = TEACHER_LINKS;
  else if (role === 'student') links = STUDENT_LINKS;

  return (
    <div className="w-64 bg-slate-100 border-r border-slate-200 h-screen fixed top-0 left-0 flex flex-col pt-16">
      <div className="absolute top-0 w-full h-16 border-b border-slate-200 flex items-center px-6 bg-slate-100 z-20">
        <h1 className="text-xl font-bold text-indigo-700 tracking-tight">College AMS</h1>
      </div>
      <div className="flex-1 overflow-y-auto pt-6 px-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === `/${role}`}
            className={({ isActive }) => cn(
              "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive 
                ? "bg-indigo-600 text-white" 
                : "text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            <link.icon className="w-5 h-5 mr-3" />
            <span className="flex-1">{link.label}</span>
            {link.badge === 'emergency' && role === 'hod' && (
              <span className="w-2 h-2 rounded-full bg-red-500 mr-1"></span>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../ui/Button';
import { 
  Users, Upload, Calendar, Settings, FileText, 
  CheckSquare, Activity, Send, Clock, BookOpen, UserCircle, Bell, Landmark, ShieldAlert, HardDrive, ShieldCheck, PieChart, Info, HelpCircle
} from 'lucide-react';

const ADMIN_LINKS = [
  { to: '/admin', icon: Activity, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/health', icon: ShieldCheck, label: 'System Health' },
  { to: '/admin/bulk-upload', icon: Upload, label: 'Bulk Upload' },
  { to: '/admin/marks-upload', icon: Upload, label: 'Marks Upload' },
  { to: '/admin/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/admin/subjects', icon: BookOpen, label: 'Subjects' },
  { to: '/admin/leaves', icon: Calendar, label: 'Leave Approvals' },
  { to: '/admin/sem-transition', icon: Send, label: 'Sem Transition' },
  { to: '/admin/config', icon: Settings, label: 'Config' },
  { to: '/admin/notices', icon: Bell, label: 'Notices' },
  { to: '/admin/holidays', icon: Calendar, label: 'Holidays' },
  { to: '/admin/backups', icon: HardDrive, label: 'Backup Files' },
  { to: '/admin/recovery', icon: ShieldAlert, label: 'Recovery' },
  { to: '/admin/preferences', icon: Settings, label: 'Preferences' },
];

const HOD_LINKS = [
  { to: '/hod', icon: Activity, label: 'Dashboard' },
  { to: '/hod/attendance', icon: CheckSquare, label: 'Attendance' },
  { to: '/hod/analysis', icon: PieChart, label: 'Marks Analysis' },
  { to: '/hod/holidays', icon: Calendar, label: 'Holidays' },
  { to: '/hod/end-sem-poll', icon: FileText, label: 'End Sem Poll' },
  { to: '/hod/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/hod/subjects', icon: BookOpen, label: 'Subject Assignment' },
  { to: '/hod/leave-management', icon: Clock, label: 'Leave Management', badge: 'emergency' },
  { to: '/hod/condonation', icon: FileText, label: 'Condonation' },
  { to: '/hod/notices', icon: Bell, label: 'Notices' },
  { to: '/hod/change-requests', icon: Send, label: 'Change Requests' },
];

const TEACHER_LINKS = [
  { to: '/teacher', icon: Activity, label: 'Dashboard' },
  { to: '/teacher/mark-attendance', icon: CheckSquare, label: 'Mark Attendance' },
  { to: '/teacher/multi-class', icon: CheckSquare, label: 'Multi-Class' },
  { to: '/teacher/borrow', icon: Send, label: 'Borrow Lecture' },
  { to: '/teacher/leave-request', icon: Clock, label: 'Leave Request' },
  { to: '/teacher/condonation', icon: FileText, label: 'Condonation' },
  { to: '/teacher/history', icon: Clock, label: 'History' },
  { to: '/teacher/timetable', icon: Calendar, label: 'Timetable' },
  { to: '/teacher/notices', icon: Bell, label: 'Notices' },
];

const STUDENT_LINKS = [
  { to: '/student', icon: Activity, label: 'Dashboard' },
  { to: '/student/attendance', icon: CheckSquare, label: 'My Attendance' },
  { to: '/student/marks', icon: FileText, label: 'My Marks' },
  { to: '/student/condonation', icon: FileText, label: 'Condonation' },
  { to: '/student/end-sem', icon: Upload, label: 'End Sem' },
  { to: '/student/notices', icon: Bell, label: 'Notices' },
  { to: '/student/profile', icon: UserCircle, label: 'Profile' },
];

export const Sidebar = () => {
  const { role } = useAuth();

  const links = React.useMemo(() => {
    switch(role) {
      case 'admin': return ADMIN_LINKS;
      case 'hod': return HOD_LINKS;
      case 'teacher': return TEACHER_LINKS;
      case 'student': return STUDENT_LINKS;
      default: return [];
    }
  }, [role]);

  return (
    <div className="w-64 bg-slate-50 border-r border-slate-200 h-screen fixed top-0 left-0 flex flex-col z-20">
      <div className="h-16 border-b border-slate-200 flex items-center px-6 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-lg">C</div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">CAMS</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pt-4 pb-10 px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-200">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === `/${role}`}
            className={({ isActive }) => cn(
              "flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all group",
              isActive 
                ? "bg-indigo-600 text-white shadow-indigo-100 shadow-lg" 
                : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <link.icon className={cn("w-5 h-5 mr-3 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600")} />
                <span className="flex-1">{link.label}</span>
                {link.badge === 'emergency' && role === 'hod' && (
                  <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-xs text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors">
          <HelpCircle className="h-4 w-4" />
          <span>Support & Help</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, User, Bell } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Topbar = () => {
  const { user, role, logout } = useAuth();
  
  const roleColors = {
    admin: 'danger',
    hod: 'purple',
    teacher: 'blue',
    student: 'success',
  };

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 z-10 sticky top-0 shrink-0 shadow-sm shadow-slate-100">
      <div className="flex items-center gap-4">
        {/* Page title could go here if available */}
      </div>
      
      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-900 leading-tight">
              {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
            </span>
            {role && (
              <Badge variant={roleColors[role]} className="uppercase text-[9px] font-extrabold px-1.5 py-0">
                {role}
              </Badge>
            )}
          </div>
          
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 overflow-hidden shadow-inner">
            <User className="h-6 w-6" />
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center w-10 h-10 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

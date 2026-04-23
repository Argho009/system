import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut } from 'lucide-react';
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
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 z-10 sticky top-0">
      <div className="flex pl-64">
        {/* Empty space to offset the fixed sidebar if needed, or we just rely on parent flex */}
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-slate-800">
            {user?.user_metadata?.name || user?.email || 'User'}
          </span>
          {role && (
            <Badge variant={roleColors[role]} className="uppercase text-[10px]">
              {role}
            </Badge>
          )}
        </div>
        
        <div className="h-8 w-px bg-slate-200 mx-2"></div>
        
        <button
          onClick={logout}
          className="flex items-center text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Pinboard } from './Pinboard';

export const Layout = ({ showPinboard = true }) => {
  const location = useLocation();
  const isDashboard = location.pathname.split('/').length === 2; // e.g. /admin, /hod

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 pl-64 overflow-hidden relative">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
          {isDashboard && showPinboard && (
            <div className="animate-in slide-in-from-top duration-500">
              <Pinboard />
            </div>
          )}
          
          <div className="min-h-full pb-12">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

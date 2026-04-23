import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Pinboard } from './Pinboard';

export const Layout = ({ showPinboard = true }) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 pl-64 overflow-hidden">
        <Topbar />
        
        <main className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {showPinboard && <Pinboard />}
          <div className="bg-white rounded-lg shadow-sm w-full p-6 border border-slate-200 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

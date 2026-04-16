import React from 'react';
import { SystemSettingsForm } from '../../components/ui/SystemSettingsForm';
import { Settings, Clock, Database, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AdminConfig = () => {
  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-600" />
          System Configuration
        </h2>
        <p className="text-sm text-slate-500">Manage global variables and system maintenance tasks.</p>
      </div>

      <SystemSettingsForm />

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden opacity-60 grayscale cursor-not-allowed">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
           <Clock className="h-4 w-4 text-slate-400" />
           <h3 className="font-semibold text-slate-800">Working Hours & Slots</h3>
        </div>
        <div className="p-8 text-center bg-slate-50/30">
           <p className="text-sm text-slate-400 italic">Advanced scheduling constraints coming in Phase 2.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-indigo-500" />
            <h3 className="font-semibold text-slate-800">System Backup & Logs</h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Database backups and real-time monitoring are managed via the Supabase cloud console.</p>
          <div className="flex gap-4">
            <Button variant="outline" size="sm" onClick={() => window.open('https://app.supabase.com', '_blank')}>
               Open Supabase Dashboard
               <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

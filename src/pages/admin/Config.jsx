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

      <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden border-t-4 border-t-red-500">
        <div className="p-6 border-b border-red-50 bg-red-50/50 flex items-center gap-2">
           <Database className="h-4 w-4 text-red-500" />
           <h3 className="font-semibold text-red-800">Danger Zone — System Reset</h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            Wipe all attendance records, lecture logs, and manual balances. <strong>This action cannot be undone.</strong>
          </p>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={async () => {
              if (confirm("Are you absolutely sure? This will delete ALL student attendance records for ALL subjects. Type 'DELETE' to confirm.")) {
                const check = prompt("Type 'DELETE' to confirm:");
                if (check === 'DELETE') {
                  try {
                    await api.resetAttendance();
                    alert("System reset successful.");
                  } catch (e) {
                    alert("Failed to reset: " + e.message);
                  }
                }
              }
            }}
          >
            Clean Attendance Data
          </Button>
        </div>
      </div>
    </div>
  );
};

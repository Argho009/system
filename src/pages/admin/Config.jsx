import React from 'react';
import { SystemSettingsForm } from '../../components/ui/SystemSettingsForm';
import { 
  Settings, Clock, Database, ExternalLink, 
  ShieldCheck, RefreshCw, Key, Globe, 
  ChevronRight, Laptop, MessageSquare, 
  Activity, Bell
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AdminConfig = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
             <Settings className="h-4 w-4" />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Global Environment</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h2>
          <p className="text-sm text-slate-500 font-medium">Fine-tune institutional variables and security protocols.</p>
        </div>
        <Button variant="outline" className="bg-white" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Apply Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
           <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100/50 bg-white">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                       <ShieldCheck className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-slate-900 tracking-tight">Core System Variables</h3>
                 </div>
              </div>
              <div className="p-8">
                <SystemSettingsForm />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="panel p-6 bg-white border-slate-200">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                       <Clock className="h-4 w-4" />
                    </div>
                    <h4 className="font-bold text-slate-800 tracking-tight">Academic Hours</h4>
                 </div>
                 <div className="p-10 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-center">
                    <div className="p-3 bg-slate-50 rounded-full mb-3">
                       <Laptop className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Planned Roadmap</p>
                    <p className="text-xs text-slate-500 font-medium mt-1 italic">Fine-level scheduling constraints arriving in next sync.</p>
                 </div>
              </div>

              <div className="panel p-6 bg-white border-slate-200">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400">
                       <MessageSquare className="h-4 w-4" />
                    </div>
                    <h4 className="font-bold text-slate-800 tracking-tight">Notification Webhooks</h4>
                 </div>
                 <div className="space-y-4">
                    <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <Globe className="h-4 w-4 text-indigo-400" />
                          <span className="text-xs font-bold text-indigo-900">Push Notifications</span>
                       </div>
                       <Badge variant="green">ACTIVE</Badge>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between opacity-50 grayscale">
                       <div className="flex items-center gap-3 font-bold text-slate-400 text-xs">
                          <Bell className="h-4 w-4" />
                          <span>SMS Gateway</span>
                       </div>
                       <span className="text-[10px] font-bold uppercase tracking-widest">SOON</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <div className="panel p-6 bg-slate-900 text-white border-none relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <Key className="h-20 w-20" />
              </div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-400" />
                Control Plane
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                External infrastructure management and direct database access. USE WITH EXTREME CAUTION.
              </p>
              <Button 
                variant="outline" 
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 shadow-xl shadow-black/20"
                onClick={() => window.open('https://app.supabase.com', '_blank')}
              >
                Super-Admin Panel
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
           </div>

           <div className="panel p-6 border-slate-200">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">System Identity</h4>
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">Kernel Version</span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-lg">v2.0.4-PROD</span>
                 </div>
                 <div className="flex items-center justify-between p-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">Uptime Rate</span>
                    <div className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                       <span className="text-xs font-black text-slate-700">99.9%</span>
                    </div>
                 </div>
                  <div className="flex items-center justify-between p-2">
                    <span className="text-xs font-bold text-slate-500">Active Daemons</span>
                    <span className="text-xs font-bold text-slate-700">12 Ready</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

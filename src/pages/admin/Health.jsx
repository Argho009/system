import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { 
  ShieldCheck, RefreshCw, Database, AlertCircle, 
  Users, GraduationCap, HardDrive, Download, Search
} from 'lucide-react';
import { exportToExcel } from '../../utils/exportExcel';

export const AdminSystemHealth = () => {
  const [health, setHealth] = useState(null);
  const [brokenUsers, setBrokenUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    const [hRes, bRes] = await Promise.all([
      supabase.rpc('get_system_health'),
      supabase.rpc('get_broken_users')
    ]);

    if (hRes.data) setHealth(hRes.data);
    if (bRes.data) setBrokenUsers(bRes.data);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleMaintenance = async (method, label) => {
    setActionLoading(label);
    try {
      const { error } = await supabase.rpc(method);
      if (error) throw error;
      toast.success(`${label} completed successfully`);
      await fetchHealth();
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const downloadCredentials = async () => {
    try {
      const { data, error } = await supabase.from('users').select('college_id, name, role, initial_password').is('deleted_at', null);
      if (error) throw error;
      
      exportToExcel(data, 'User_Credentials_Backup', [
        { header: 'College ID', key: 'college_id' },
        { header: 'Name', key: 'name' },
        { header: 'Role', key: 'role' },
        { header: 'Initial Password', key: 'initial_password' },
      ]);
      toast.success('Credentials exported.');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  const brokenColumns = [
    { header: 'College ID', accessor: 'college_id', render: r => <span className="font-mono font-bold text-xs">{r.college_id}</span> },
    { header: 'Identity Name', accessor: 'name' },
    { header: 'Role', accessor: 'role', render: r => <Badge variant="slate" className="uppercase text-[9px]">{r.role}</Badge> },
    { 
      header: 'Detected Issue', 
      accessor: 'issue', 
      render: r => (
        <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {r.issue}
        </span>
      )
    },
    {
      header: 'Recovery',
      accessor: 'id',
      render: r => (
        <Button size="sm" variant="ghost" className="h-8 text-indigo-600 font-bold text-[10px]" onClick={async () => {
          setActionLoading(`Sync-${r.id}`);
          const { error } = await supabase.rpc('sync_user_to_auth', { target_id: r.id });
          if (error) toast.error('Sync failed');
          else {
            toast.success(`${r.college_id} synchronized`);
            fetchHealth();
          }
          setActionLoading(null);
        }}>
          {actionLoading === `Sync-${r.id}` ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'REPAIR'}
        </Button>
      )
    }
  ];

  if (loading && !health) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-medium">Analyzing system integrity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Diagnostic Terminal</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Infrastructure Health</h2>
          <p className="text-sm text-slate-500 font-medium">Monitoring synchronization between Auth and Public identity layers.</p>
        </div>
        <Button variant="outline" onClick={fetchHealth} disabled={loading} className="h-11 rounded-xl">
           <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
           Recalculate Integrity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={health?.total_users} icon={Users} color="slate" />
        <StatCard 
          title="Missing Auth" 
          value={health?.missing_from_auth} 
          icon={AlertCircle} 
          color={health?.missing_from_auth > 0 ? "red" : "green"} 
          subtitle="Critical Repair Required"
        />
        <StatCard 
          title="Broken Ident." 
          value={health?.missing_identities} 
          icon={AlertCircle} 
          color={health?.missing_identities > 0 ? "red" : "green"} 
          subtitle="Identity mismatch"
        />
        <StatCard title="Database Size" value={`${health?.db_size_mb} MB`} icon={HardDrive} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           {/* Detailed Broken Users Registry */}
           <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100/50 bg-white">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  Synchronization Audit Logs
                </h3>
                <Badge variant={brokenUsers.length > 0 ? 'danger' : 'success'} className="px-3">
                  {brokenUsers.length} Issues Found
                </Badge>
              </div>
              <Table 
                columns={brokenColumns} 
                data={brokenUsers} 
                loading={loading}
                emptyMessage="Architecture is healthy. No synchronization issues detected."
              />
           </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <div className="panel p-6 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 bg-gradient-to-br from-white to-transparent rounded-full h-32 w-32 -mr-16 -mt-16" />
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                    <Database className="h-5 w-5 text-indigo-400" />
                    Infrastructure Toolset
                </h3>
                <div className="space-y-4">
                    <MaintenanceAction 
                        title="Atomic Identity Sync"
                        desc="Batch repairs every user identity in the background."
                        onClick={() => handleMaintenance('sync_all_users_to_auth', 'Global Sync')}
                        loading={actionLoading === 'Global Sync'}
                    />
                    <MaintenanceAction 
                        title="Credential Safe Export"
                        desc="Backup of all college IDs and initial passwords."
                        onClick={downloadCredentials}
                        variant="secondary"
                    />
                </div>
            </div>

            <div className="panel p-6 bg-indigo-50 border-indigo-100">
                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> Automated Self-Healing
                </h4>
                <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">
                    The system performs a silent health check on every admin login. Manual intervention is only required if the dashboard shows red indicators above.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

const MaintenanceAction = ({ title, desc, onClick, loading, variant = 'primary' }) => (
  <button 
    onClick={onClick}
    disabled={loading}
    className={`w-full text-left p-4 rounded-2xl border transition-all ${
        variant === 'primary' 
        ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" 
        : "bg-indigo-600/10 border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400"
    }`}
  >
    <div className="flex items-center justify-between mb-1">
        <h5 className="text-sm font-bold">{title}</h5>
        {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
    </div>
    <p className="text-[10px] opacity-60 font-medium leading-relaxed">{desc}</p>
  </button>
);

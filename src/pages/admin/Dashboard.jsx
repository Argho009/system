import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { 
  Users, BookOpen, GraduationCap, Bell, UserPlus, 
  Upload, Calendar, ArrowRightLeft, ShieldCheck, 
  Activity, AlertCircle, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, teachers: 0, hods: 0, branches: 0 });
  const [healthStatus, setHealthStatus] = useState('OK');
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [studentsRes, teachersRes, hodsRes, branchesRes, healthRes] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'hod'),
        supabase.from('branches').select('*', { count: 'exact', head: true }),
        supabase.rpc('get_system_health')
      ]);
      
      setStats({
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        hods: hodsRes.count || 0,
        branches: branchesRes.count || 0,
      });

      if (healthRes.data) {
        setHealthStatus(healthRes.data.missing_from_auth > 0 ? 'Warning' : 'OK');
      }

      const { data: logs } = await supabase
        .from('bulk_upload_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentLogs(logs || []);
      setLoading(false);
    };
    fetchData();
  }, []);

  // Silent system health check on first login/load
  useEffect(() => {
    const runSilentRepair = async () => {
      try {
        const { data: health } = await supabase.rpc('get_system_health');
        if (health && (health.missing_from_auth > 0 || health.missing_identities > 0)) {
          console.info('Auto-syncing users to auth...');
          await supabase.rpc('sync_all_users_to_auth');
        }
      } catch (e) {
        console.warn('Silent health check failed:', e);
      }
    };
    
    // Only run once per session
    const hasChecked = sessionStorage.getItem('health_checked');
    if (!hasChecked) {
      runSilentRepair();
      sessionStorage.setItem('health_checked', 'true');
    }
  }, []);

  const logColumns = [
    { header: 'File Name', accessor: 'file_name' },
    { header: 'Type', accessor: 'type', render: (row) => <span className="capitalize">{row.type}</span> },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge variant={row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'}>
          {row.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString('en-IN'),
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Console</h2>
          <p className="text-slate-500 mt-1 font-medium">System-wide oversight & infrastructure management.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={healthStatus === 'OK' ? 'success' : 'danger'} className="h-8 px-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            System {healthStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={loading ? '...' : stats.students} icon={GraduationCap} color="indigo" />
        <StatCard title="Total Teachers" value={loading ? '...' : stats.teachers} icon={Users} color="slate" />
        <StatCard title="Total HODs" value={loading ? '...' : stats.hods} icon={Briefcase} color="slate" />
        <StatCard title="Active Branches" value={loading ? '...' : stats.branches} icon={Landmark} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              Recent Activity
            </h3>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Last 10 events</span>
          </div>
          <Table columns={logColumns} data={recentLogs} emptyMessage="No recent activity found." />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900 px-2">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <QuickAction to="/admin/users" title="User Management" icon={UserPlus} desc="Create, edit, or reset accounts" />
            <QuickAction to="/admin/bulk-upload" title="Bulk Import" icon={Upload} desc="Batch import roles from Excel" />
            <QuickAction to="/admin/timetable" title="Timetable Grid" icon={Calendar} desc="Schedule slots and rooms" />
            <QuickAction to="/admin/sem-transition" title="Semester Roll" icon={ArrowRightLeft} desc="Promote students to next sem" />
            <QuickAction to="/admin/health" title="System Health" icon={ShieldCheck} desc="Repair DB sync & auth links" />
          </div>
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ to, title, icon: Icon, desc }) => (
  <Link to={to} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-50 transition-all group">
    <div className="p-3 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
      <Icon className="h-6 w-6" />
    </div>
    <div>
      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{title}</h4>
      <p className="text-xs text-slate-500 font-medium">{desc}</p>
    </div>
  </Link>
);

const Briefcase = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
);

const Landmark = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="2" y1="22" x2="22" y2="22"></line><path d="M18 12V7"></path><path d="M12 12V7"></path><path d="M6 12V7"></path><path d="M2 7L12 2l10 5"></path><path d="M4 22V12h16v10"></path></svg>
);

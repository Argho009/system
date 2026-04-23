import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Users, BookOpen, GraduationCap, Bell, UserPlus, Upload, Calendar, ArrowRightLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, teachers: 0, subjects: 0, notices: 0 });
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const summary = await api.getAdminSummary();
        setStats({
          students: summary.students || 0,
          teachers: summary.teachers || 0,
          subjects: summary.subjects || 0,
          notices: summary.notices || 0,
        });
        const logs = await api.getBulkUploadLogs(5);
        setRecentLogs(logs || []);
      } catch {
        setStats({ students: 0, teachers: 0, subjects: 0, notices: 0 });
        setRecentLogs([]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const logColumns = [
    { header: 'File Name', accessor: 'file_name' },
    {
      header: 'Type',
      accessor: 'type',
      render: (row) => (
        <span className="capitalize">{(row.type || '—').replace('_', ' ')}</span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <Badge variant={row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'}>
          {(row.status || '').toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: (row) => new Date(row.created_at).toLocaleDateString('en-IN'),
    },
  ];

  const QuickLink = ({ to, title, icon: Icon, description }) => (
    <Link to={to} className="block group">
      <div className="p-4 rounded-lg border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all flex items-center gap-4">
        <div className="p-3 rounded-md bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{title}</h4>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Admin Dashboard</h2>
        <p className="text-sm text-slate-500">Welcome back. Here's what's happening across the college.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={loading ? '...' : stats.students} icon={GraduationCap} color="indigo" />
        <StatCard title="Total Teachers" value={loading ? '...' : stats.teachers} icon={Users} color="slate" />
        <StatCard title="Total Subjects" value={loading ? '...' : stats.subjects} icon={BookOpen} color="green" />
        <StatCard title="Active Notices" value={loading ? '...' : stats.notices} icon={Bell} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">Recent Activity</h3>
            <span className="text-xs text-slate-500">Last 5 bulk uploads</span>
          </div>
          <Table columns={logColumns} data={recentLogs} emptyMessage="No recent activity found." />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-800">Quick Links</h3>
          <div className="grid grid-cols-1 gap-3">
            <QuickLink to="/admin/users" title="Add User" icon={UserPlus} description="Create new system accounts" />
            <QuickLink to="/admin/bulk-upload" title="Upload Student Roles" icon={Upload} description="Batch import with Excel" />
            <QuickLink to="/admin/timetable" title="Manage Timetable" icon={Calendar} description="Assign rooms and subjects" />
            <QuickLink to="/admin/sem-transition" title="Semester Transition" icon={ArrowRightLeft} description="Move students to next sem" />
          </div>
        </div>
      </div>
    </div>
  );
};

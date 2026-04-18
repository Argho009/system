import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { AlertTriangle, Users, BookOpen, Clock } from 'lucide-react';

export const HodDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, pendingLeaves: 0, pendingCondonation: 0, subjects: 0 });
  const [lowAttendance, setLowAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [studentsRes, leavesRes, condonRes, subjectsRes] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }),
      supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('attendance_condonation').select('*', { count: 'exact', head: true }).in('status', ['pending', 'teacher_review']),
      supabase.from('subjects').select('*', { count: 'exact', head: true }),
    ]);
    setStats({
      students: studentsRes.count || 0,
      pendingLeaves: leavesRes.count || 0,
      pendingCondonation: condonRes.count || 0,
      subjects: subjectsRes.count || 0,
    });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">HOD Dashboard</h2>
        <p className="text-sm text-slate-500">Department overview, pending approvals, and attendance alerts.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Students" value={loading ? '...' : stats.students} color="green" />
        <StatCard title="Subjects" value={loading ? '...' : stats.subjects} color="indigo" />
        <StatCard
          title="Pending Leaves"
          value={loading ? '...' : stats.pendingLeaves}
          subtitle="Require action"
          color={stats.pendingLeaves > 0 ? 'red' : 'slate'}
        />
        <StatCard
          title="Condonation"
          value={loading ? '...' : stats.pendingCondonation}
          subtitle="Awaiting approval"
          color={stats.pendingCondonation > 0 ? 'red' : 'slate'}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Attendance Alert:</strong> Students with attendance below 75% require review.
          Navigate to Attendance Overview to view a detailed report.
        </div>
      </div>
    </div>
  );
};

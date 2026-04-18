import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { BookOpen, Calendar } from 'lucide-react';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [todaySlots, setTodaySlots] = useState([]);
  const [stats, setStats] = useState({ totalLectures: 0, thisWeek: 0, pendingLeaves: 0 });
  const [loading, setLoading] = useState(true);
  const [teacherRecord, setTeacherRecord] = useState(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  async function fetchData() {
    setLoading(true);
    const today = DAYS[new Date().getDay()];

    // Get teacher's assignments
    const { data: assignments } = await supabase
      .from('subject_assignments')
      .select('subject_id, subjects(id, code, name, sem, branch)')
      .eq('teacher_id', user.id);

    const subjectIds = (assignments || []).map(a => a.subject_id);

    // Get today's timetable for teacher's subjects
    const { data: todayTimetable } = await supabase
      .from('timetable')
      .select('*, subjects(code, name)')
      .in('subject_id', subjectIds.length ? subjectIds : ['00000000-0000-0000-0000-000000000000'])
      .eq('day_of_week', today)
      .order('lecture_no');

    setTodaySlots(todayTimetable || []);

    // Stats
    const today8 = new Date(); today8.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today8); weekAgo.setDate(weekAgo.getDate() - 7);

    const [totalRes, weekRes, leaveRes] = await Promise.all([
      supabase.from('lectures').select('*', { count: 'exact', head: true }).eq('teacher_id', user.id),
      supabase.from('lectures').select('*', { count: 'exact', head: true }).eq('teacher_id', user.id).gte('date', weekAgo.toISOString().split('T')[0]),
      supabase.from('leave_requests').select('*', { count: 'exact', head: true }).eq('teacher_id', user.id).eq('status', 'pending'),
    ]);

    setStats({
      totalLectures: totalRes.count || 0,
      thisWeek: weekRes.count || 0,
      pendingLeaves: leaveRes.count || 0,
    });
    setLoading(false);
  }

  const currentHour = new Date().getHours();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Teacher Dashboard</h2>
        <p className="text-sm text-slate-500">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Lectures" value={loading ? '...' : stats.totalLectures} color="indigo" />
        <StatCard title="This Week" value={loading ? '...' : stats.thisWeek} color="green" />
        <StatCard title="Pending Leaves" value={loading ? '...' : stats.pendingLeaves} color={stats.pendingLeaves > 0 ? 'red' : 'slate'} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Today's Schedule
        </h3>
        {loading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : todaySlots.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No classes scheduled for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todaySlots.map((slot) => (
              <div key={slot.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0">
                  {slot.lecture_no}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{slot.subjects?.code}</p>
                  <p className="text-sm text-slate-500">{slot.subjects?.name}</p>
                  {slot.room && <p className="text-xs text-slate-400 mt-1">Room: {slot.room}</p>}
                </div>
                <div className="ml-auto">
                  <Badge variant="indigo">{slot.branch} Sem {slot.sem}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

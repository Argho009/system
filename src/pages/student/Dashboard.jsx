import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';
import { Bell, BookOpen } from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [subjectSummary, setSubjectSummary] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const stu = await api.getStudentForUser(user.id);
      if (!stu) {
        setLoading(false);
        return;
      }
      setStudent({ ...stu, users: { name: user?.name } });

      const allSubs = await api.getSubjects();
      const subjects = (allSubs || []).filter(
        (s) => s.branch === stu.branch && s.sem === stu.sem
      );

      if (subjects.length) {
        const subIds = new Set(subjects.map((s) => s.id));
        const lecRes = await api.getLectures({ sem: stu.sem, is_skipped: 'false' });
        const lectures = (lecRes || []).filter((l) => subIds.has(l.subject_id));

        const attendance = await api.getAttendance({ student_id: stu.id });
        const condonation = await api.getAttendanceCondonation({ student_id: stu.id });

        const summary = subjects.map((sub) => {
          const subLectures = lectures.filter((l) => l.subject_id === sub.id);
          const subAttendance = (attendance || []).filter((a) => {
            const lec = lectures.find((l) => l.id === a.lecture_id);
            return lec?.subject_id === sub.id;
          });
          const present = subAttendance.filter((a) => a.status === 'present').length;
          const late = subAttendance.filter((a) => a.status === 'late').length;
          const excused = subAttendance.filter((a) => a.status === 'excused').length;
          const total = subLectures.length;
          const condoned = (condonation || [])
            .filter((c) => c.subject_id === sub.id && c.status === 'approved')
            .reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);
          const raw = rawPercent(present, late, total);
          const final = finalPercent(present, late, condoned, total);
          return { ...sub, present, late, excused, total, condoned, raw, final };
        });
        setSubjectSummary(summary);
      }

      const allNotices = await api.getNotices();
      const noticesData = (allNotices || [])
        .filter(
          (n) =>
            n.is_active &&
            (n.branch == null || n.branch === 'All' || n.branch === stu.branch) &&
            (n.sem == null || n.sem === 0 || n.sem === stu.sem)
        )
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
          return new Date(b.created_at) - new Date(a.created_at);
        })
        .slice(0, 3);

      setNotices(noticesData);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) return <p className="text-sm text-slate-500">Loading dashboard...</p>;
  if (!student) return <p className="text-sm text-red-500">Student profile not found. Contact admin.</p>;

  const overall = subjectSummary.length
    ? subjectSummary.reduce((a, b) => a + b.final, 0) / subjectSummary.length
    : 0;
  const lowCount = subjectSummary.filter((s) => s.final < 75).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Welcome, {student.users?.name}</h2>
        <p className="text-sm text-slate-500">
          {student.roll_no} • {student.branch} • Semester {student.sem}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard
          title="Overall Attendance"
          value={`${overall.toFixed(1)}%`}
          color={overall >= 75 ? 'green' : 'red'}
        />
        <StatCard title="Subjects" value={subjectSummary.length} color="indigo" />
        <StatCard
          title="Below 75%"
          value={lowCount}
          color={lowCount > 0 ? 'red' : 'slate'}
          subtitle="Subjects at risk"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> Subject-wise Attendance
        </h3>
        <div className="space-y-2">
          {subjectSummary.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="font-semibold text-slate-800 text-sm">
                  {s.code} <span className="font-normal text-slate-500">— {s.name}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {s.present + s.late}/{s.total} attended
                  {s.late > 0 ? ` (${s.late} late)` : ''}
                  {s.condoned > 0 ? ` • ${s.condoned} condoned` : ''}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${colorForPercent(s.final)}`}>
                {s.final}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {notices.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" /> Recent Notices
          </h3>
          <div className="space-y-2">
            {notices.map((n) => (
              <div key={n.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                  <Badge variant="default">{n.type}</Badge>
                </div>
                {n.due_date && (
                  <p className="text-xs text-red-600 mt-1">
                    Due: {new Date(n.due_date).toLocaleDateString('en-IN')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

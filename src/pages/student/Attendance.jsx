import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui/Badge';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';

export const StudentAttendance = () => {
  const { user } = useAuth();
  const [subjectData, setSubjectData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [lectureDetail, setLectureDetail] = useState([]);
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

      const allSubs = await api.getSubjects();
      const subjects = (allSubs || []).filter(
        (s) => s.branch === stu.branch && s.sem === stu.sem
      );

      const lecRes = await api.getLectures({ sem: stu.sem, is_skipped: 'false' });
      const subIds = new Set(subjects.map((s) => s.id));
      const lectures = (lecRes || [])
        .filter((l) => subIds.has(l.subject_id))
        .sort((a, b) => a.date.localeCompare(b.date));

      const [attendance, condonation, mInits] = await Promise.all([
        api.getAttendance({ student_id: stu.id }),
        api.getAttendanceCondonation({ student_id: stu.id }),
        api.getManualInit({ branch_name: stu.branch, sem: stu.sem })
      ]);
      const manualInits = Array.isArray(mInits) ? mInits : [];

      const summary = subjects.map((sub) => {
        const subLectures = lectures.filter((l) => l.subject_id === sub.id);
        const subAtt = (attendance || []).filter((a) =>
          subLectures.some((l) => l.id === a.lecture_id)
        );
        let present = subAtt.filter((a) => a.status === 'present').length;
        let total = subLectures.length;
        
        // Add Manual Initials
        manualInits.filter(i => i.subject_id === sub.id).forEach(init => {
          total += (init.total_lectures_init || 0);
          const sc = (init.student_counts || []).find(c => c.student_id === stu.id);
          if (sc) present += (sc.present_count_init || 0);
        });

        const condoned = (condonation || [])
          .filter((c) => c.subject_id === sub.id && c.status === 'approved')
          .reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);
        return {
          ...sub,
          present,
          total,
          condoned,
          raw: rawPercent(present, total),
          final: finalPercent(present, condoned, total),
          lectures: subLectures,
          attendance: subAtt,
        };
      });
      setSubjectData(summary);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleViewDetail = (sub) => {
    setSelectedSubject(sub);
    const detail = sub.lectures
      .map((l) => ({
        date: l.date,
        lectureNo: l.lecture_no,
        status: sub.attendance.find((a) => a.lecture_id === l.id)?.status || 'absent',
        remarks: sub.attendance.find((a) => a.lecture_id === l.id)?.remarks,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    setLectureDetail(detail);
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  if (selectedSubject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedSubject(null)}
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {selectedSubject.code} — {selectedSubject.name}
            </h2>
            <p className="text-sm text-slate-500">
              {selectedSubject.present}/{selectedSubject.total} present •{' '}
              <span className={`font-bold ${colorForPercent(selectedSubject.final)}`}>
                {selectedSubject.final}% final
              </span>
              {selectedSubject.condoned > 0 && (
                <span className="ml-2 text-blue-600">
                  ({selectedSubject.condoned} condoned)
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Lec #</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {lectureDetail.map((l, i) => (
                <tr
                  key={i}
                  className={`border-b last:border-0 ${l.status === 'present' ? 'bg-green-50/30' : 'bg-red-50/30'}`}
                >
                  <td className="px-4 py-3">
                    {new Date(l.date).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3">{l.lectureNo}</td>
                  <td className="px-4 py-3">
                    <Badge variant={l.status === 'present' ? 'success' : 'danger'}>
                      {l.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{l.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">My Attendance</h2>
        <p className="text-sm text-slate-500">
          Subject-wise attendance. Click on a subject to see lecture-by-lecture detail.
        </p>
      </div>

      <div className="space-y-3">
        {subjectData.map((sub) => (
          <div
            key={sub.id}
            onClick={() => handleViewDetail(sub)}
            className="bg-white border border-slate-200 rounded-lg p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <div className="flex-1">
              <p className="font-semibold text-slate-800">
                {sub.code} <span className="font-normal text-slate-500">— {sub.name}</span>
              </p>
              <div className="mt-2 flex items-center gap-1">
                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${sub.final >= 75 ? 'bg-green-500' : sub.final >= 65 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, sub.final)}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {sub.present}/{sub.total} attended
                {sub.condoned > 0 ? ` + ${sub.condoned} condoned` : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-lg font-bold ${colorForPercent(sub.final)}`}>{sub.final}%</span>
              {sub.raw !== sub.final && <p className="text-xs text-slate-400">raw: {sub.raw}%</p>}
            </div>
            <span className="text-slate-400 text-sm">→</span>
          </div>
        ))}
      </div>
    </div>
  );
};

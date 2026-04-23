import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui/Badge';

export const StudentMarks = () => {
  const { user } = useAuth();
  const [ctMarks, setCtMarks] = useState([]);
  const [endsem, setEndsem] = useState([]);
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

      const [ctRes, esRes] = await Promise.all([
        api.getCtMarks({ student_id: stu.id }),
        api.getEndsemMarks({ student_id: stu.id }),
      ]);
      setCtMarks(Array.isArray(ctRes) ? ctRes : []);
      const es = (Array.isArray(esRes) ? esRes : []).filter((e) => e.sem === stu.sem);
      setEndsem(es);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const ctBySubject = ctMarks.reduce((acc, m) => {
    const key = m.subject_id;
    if (!acc[key]) acc[key] = { code: m.subjects?.code, name: m.subjects?.name, tests: [] };
    acc[key].tests.push(m);
    return acc;
  }, {});

  const getGrade = (pct) => {
    if (pct >= 90) return { label: 'O', color: 'success' };
    if (pct >= 80) return { label: 'A+', color: 'success' };
    if (pct >= 70) return { label: 'A', color: 'blue' };
    if (pct >= 60) return { label: 'B+', color: 'indigo' };
    if (pct >= 50) return { label: 'B', color: 'default' };
    if (pct >= 40) return { label: 'C', color: 'warning' };
    return { label: 'F', color: 'danger' };
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">My Marks</h2>
        <p className="text-sm text-slate-500">CT and End Semester marks.</p>
      </div>

      <section>
        <h3 className="text-base font-semibold text-slate-700 mb-3">Continuous Assessment (CT / Tests)</h3>
        {Object.keys(ctBySubject).length === 0 ? (
          <p className="text-sm text-slate-400">No marks uploaded yet.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(ctBySubject).map(([subId, sub]) => (
              <div key={subId} className="bg-white border border-slate-200 rounded-lg p-4">
                <p className="font-semibold text-slate-800 mb-3">
                  {sub.code} — {sub.name}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {sub.tests.map((t) => {
                    const pct = t.max_marks ? (t.marks_obtained / t.max_marks) * 100 : 0;
                    const grade = getGrade(pct);
                    return (
                      <div
                        key={t.id}
                        className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200"
                      >
                        <p className="text-xs font-semibold text-slate-500 uppercase">{t.test_name}</p>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {t.marks_obtained ?? '—'}
                          <span className="text-sm font-normal text-slate-400">/{t.max_marks}</span>
                        </p>
                        <div className="mt-2 flex items-center justify-center gap-1.5">
                          <Badge variant={grade.color}>{grade.label}</Badge>
                          <span className="text-xs text-slate-500">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {endsem.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-slate-700 mb-3">End Semester</h3>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3 text-center">Marks</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {endsem.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-indigo-700">{e.subjects?.code}</span>
                      <span className="ml-2 text-slate-600">{e.subjects?.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold">{e.marks ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={e.is_locked ? 'success' : e.poll_open ? 'blue' : 'default'}>
                        {e.is_locked ? 'Locked' : e.poll_open ? 'Submission Open' : 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

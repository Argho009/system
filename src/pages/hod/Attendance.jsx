import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';

export const HodAttendance = () => {
  const [branch, setBranch] = useState('');
  const [sem, setSem] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    api.getBranches().then((data) => {
      if (data) setBranches(data.map((b) => b.name));
    });
  }, []);

  const generateReport = async () => {
    if (!branch || !sem) return toast.error('Select branch and semester');
    setLoading(true);
    try {
      const students = await api.getStudents({ branch, sem: parseInt(sem, 10) });
      if (!students?.length) {
        toast.error('No students found');
        setLoading(false);
        return;
      }

      const [lectures, condData, initData] = await Promise.all([
        api.getLecturesForBranch(branch, parseInt(sem, 10)),
        api.getAttendanceCondonation({ branch, sem: parseInt(sem, 10) }),
        api.getManualInit({ branch_name: branch, sem: parseInt(sem, 10) })
      ]);

      const condonation = (condData || []).filter((c) => c.status === 'approved');
      const manualInits = Array.isArray(initData) ? initData : [];

      const reportRows = students.map((stu) => {
        const stuAttendance = (attendance || []).filter((a) => a.student_id === stu.id);
        
        let present = stuAttendance.filter((a) => a.status === 'present').length;
        let total = (lectureIds || []).length;

        // Add Manual Initials
        manualInits.forEach(init => {
          total += (init.total_lectures_init || 0);
          const sc = (init.student_counts || []).find(c => c.student_id === stu.id);
          if (sc) present += (sc.present_count_init || 0);
        });

        const condoned = (condonation || [])
          .filter((c) => c.student_id === stu.id)
          .reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);

        const raw = rawPercent(present, total);
        const final = finalPercent(present, condoned, total);
        
        return {
          roll_no: stu.roll_no,
          name: stu.users?.name || 'Unknown',
          present,
          total,
          condoned,
          raw,
          final,
        };
      });

      setReport(reportRows.sort((a, b) => a.final - b.final));
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Attendance Overview</h2>
        <p className="text-sm text-slate-500">View cumulative attendance for any branch and semester.</p>
      </div>

      <div className="bg-white p-4 border border-slate-200 rounded-lg flex gap-4 items-end flex-wrap">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Branch</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 min-w-[120px]"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Select...</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Semester</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 min-w-[100px]"
            value={sem}
            onChange={(e) => setSem(e.target.value)}
          >
            <option value="">Select...</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {report.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3">Roll</th>
                <th className="text-left p-3">Name</th>
                <th className="text-right p-3">Present</th>
                <th className="text-right p-3">Total Lec</th>
                <th className="text-right p-3">Condoned</th>
                <th className="text-right p-3">Raw %</th>
                <th className="text-right p-3">Final %</th>
              </tr>
            </thead>
            <tbody>
              {report.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="p-3 font-mono">{r.roll_no}</td>
                  <td className="p-3">{r.name}</td>
                  <td className="p-3 text-right">{r.present}</td>
                  <td className="p-3 text-right">{r.total}</td>
                  <td className="p-3 text-right">{r.condoned}</td>
                  <td className="p-3 text-right">{r.raw.toFixed(1)}</td>
                  <td className={`p-3 text-right rounded font-semibold ${colorForPercent(r.final)}`}>
                    {r.final.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

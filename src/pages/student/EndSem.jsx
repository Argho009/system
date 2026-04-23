import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { Upload, Lock } from 'lucide-react';

export const StudentEndSem = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [endsemData, setEndsemData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [markInputs, setMarkInputs] = useState({});

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const stu = await api.getStudentForUser(user.id);
      if (!stu) { setLoading(false); return; }
      setStudent(stu);

      let configRes;
      try {
        configRes = await api.getSystemConfigKey('current_academic_year');
      } catch {
        configRes = null;
      }
      const academicYear = configRes?.value || '2024-25';

      const subList = await api.getSubjects();
      const subjects = (subList || []).filter(
        s => s.branch === stu.branch && Number(s.sem) === Number(stu.sem)
      );

      const marks = await api.getEndsemMarks({ student_id: stu.id });
      const marksForSem = (marks || []).filter(
        m => m.sem === stu.sem && m.academic_year === academicYear
      );

      const merged = subjects.map(sub => {
        const m = marksForSem.find(x => x.subject_id === sub.id);
        return { ...sub, markRecord: m || null, academic_year: academicYear };
      });

      setEndsemData(merged);
      const inputs = {};
      merged.forEach(s => { if (s.markRecord) inputs[s.id] = s.markRecord.marks ?? ''; });
      setMarkInputs(inputs);
    } catch {
      toast.error('Failed to load marks');
    }
    setLoading(false);
  };

  const handleSubmitMark = async (sub) => {
    const marks = parseFloat(markInputs[sub.id]);
    if (isNaN(marks)) return toast.error('Enter valid marks');
    setUploading(prev => ({ ...prev, [sub.id]: true }));

    try {
      if (sub.markRecord) {
        await api.patchEndsemMarks({
          id: sub.markRecord.id,
          marks,
          submitted_by: user.id,
        });
        toast.success('Marks submitted');
      } else {
        await api.createEndsemMark({
          student_id: student.id,
          subject_id: sub.id,
          sem: student.sem,
          marks,
          submitted_by: user.id,
          academic_year: sub.academic_year,
        });
        toast.success('Marks submitted');
      }
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    }
    setUploading(prev => ({ ...prev, [sub.id]: false }));
  };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">End Semester Submissions</h2>
        <p className="text-sm text-slate-500">Submit your end semester marks when the poll is open.</p>
      </div>

      <div className="space-y-3">
        {endsemData.length === 0 && <p className="text-sm text-slate-400">No subjects found for your branch/semester.</p>}
        {endsemData.map(sub => {
          const isOpen = !!sub.markRecord?.poll_open;
          const isLocked = !!sub.markRecord?.is_locked;
          const hasMarks = sub.markRecord?.marks !== null && sub.markRecord?.marks !== undefined;

          return (
            <div key={sub.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo">{sub.code}</Badge>
                    {isLocked && <Badge variant="success"><Lock className="w-3 h-3 mr-1" />Locked</Badge>}
                    {!isLocked && isOpen && <Badge variant="blue">Poll Open</Badge>}
                    {!isLocked && !isOpen && <Badge variant="default">Poll Closed</Badge>}
                  </div>
                  <p className="font-semibold text-slate-800">{sub.name}</p>
                  {hasMarks && (
                    <p className="text-sm text-slate-600">Submitted marks: <strong>{sub.markRecord.marks}</strong></p>
                  )}
                </div>

                {isOpen && !isLocked && (
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      className="w-24 h-9 rounded border border-slate-300 px-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      placeholder="Marks"
                      value={markInputs[sub.id] || ''}
                      onChange={e => setMarkInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    />
                    <Button size="sm" onClick={() => handleSubmitMark(sub)} disabled={uploading[sub.id]}>
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      {uploading[sub.id] ? '...' : (hasMarks ? 'Update' : 'Submit')}
                    </Button>
                  </div>
                )}

                {!isOpen && !isLocked && (
                  <span className="text-xs text-slate-400 shrink-0">Waiting for HOD to open poll</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

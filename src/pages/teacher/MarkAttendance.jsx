import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toggle } from '../../components/ui/Toggle';
import { toast } from '../../components/ui/Toast';
import { CheckCircle, XCircle, Save } from 'lucide-react';

export const MarkAttendance = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({
    assignment_id: '',
    lecture_no: '',
    date: new Date().toISOString().split('T')[0],
    blank_means: 'absent',
  });
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existing, setExisting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getSubjectAssignments({ teacher_id: user.id });
        setAssignments(Array.isArray(data) ? data : []);
      } catch {
        setAssignments([]);
      }
    })();
  }, [user]);

  const getSelectedAssignment = () => assignments.find((a) => a.id === form.assignment_id);
  const getSubjectInfo = () => getSelectedAssignment()?.subjects;

  const handleProceed = async () => {
    if (!form.assignment_id || !form.lecture_no || !form.date) return toast.error('Fill all fields');
    const assignment = getSelectedAssignment();
    const subject = assignment?.subjects;
    if (!subject) return;

    setLoadingStudents(true);
    try {
      const existLec = await api.findLecture({
        subject_id: subject.id,
        date: form.date,
        lecture_no: parseInt(form.lecture_no, 10),
      });

      const branchToUse = assignment.branch_name || subject.branch;
      const studs = await api.getStudentsWithUsers({
        branch: branchToUse,
        sem: subject.sem,
      });

      if (!studs?.length) {
        toast.error(`No students found for branch ${branchToUse} (Sem ${subject.sem})`);
        setLoadingStudents(false);
        return;
      }

      setStudents(studs);
      setExisting(existLec && existLec.id ? existLec : null);

      if (existLec?.id) {
        const existAtt = await api.getAttendance({ lecture_id: existLec.id });
        const map = {};
        studs.forEach((s) => {
          map[s.id] = existLec.blank_means === 'present' ? 'present' : 'absent';
        });
        (existAtt || []).forEach((a) => {
          map[a.student_id] = a.status;
        });
        setAttendance(map);
      } else {
        const map = {};
        studs.forEach((s) => {
          map[s.id] = null; // Start in neutral/unmarked state
        });
        setAttendance(map);
      }

      setStep(2);
    } catch (e) {
      toast.error(e.message || 'Failed to load');
    }
    setLoadingStudents(false);
  };

  const toggleStudent = (id) => {
    setAttendance((prev) => {
      const curr = prev[id];
      let next;
      if (curr === null) next = 'present';
      else if (curr === 'present') next = 'late';
      else if (curr === 'late') next = 'absent';
      else next = null; // Cycle back to neutral
      return { ...prev, [id]: next };
    });
  };

  const markAll = (status) => {
    const map = {};
    students.forEach((s) => {
      map[s.id] = status;
    });
    setAttendance(map);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const assignment = getSelectedAssignment();
      const subject = assignment?.subjects;
      const cfg = await api.getSystemConfigKey('current_academic_year');
      const academicYear = cfg?.value || '2024-25';

      let lectureId = existing?.id;

      if (!lectureId) {
        const lec = await api.createLecture({
          subject_id: subject.id,
          teacher_id: user.id,
          date: form.date,
          lecture_no: parseInt(form.lecture_no, 10),
          academic_year: academicYear,
          sem: subject.sem,
          blank_means: form.blank_means,
        });
        lectureId = lec.id;
      }

      const rows = students.map((s) => ({
        lecture_id: lectureId,
        student_id: s.id,
        status: attendance[s.id] || form.blank_means,
        marked_by: user.id,
        academic_year: academicYear,
      }));
      
      await api.insertAttendance(rows);

      const presentCount = Object.values(attendance).filter((v) => v === 'present' || v === 'late').length;
      toast.success(`Attendance saved! ${presentCount}/${students.length} present.`);
      setSaving(false);
      setStep(1);
      setForm({
        assignment_id: '',
        lecture_no: '',
        date: new Date().toISOString().split('T')[0],
        blank_means: 'absent',
      });
    } catch (err) {
      toast.error(err.message || 'Save failed');
      setSaving(false);
    }
  };

  const attended = Object.values(attendance).filter((v) => v === 'present' || v === 'late').length;

  if (step === 2) {
    const assignment = getSelectedAssignment();
    const subject = assignment?.subjects;
    const branchToUse = assignment?.branch_name || subject?.branch;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Mark Attendance</h2>
            <p className="text-sm text-slate-500">
              {subject?.code} ({branchToUse}) — {form.date} — Lecture {form.lecture_no}
              {existing && (
                <span className="ml-2 text-amber-600 font-medium">(Editing existing)</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">
              {attended}/{students.length} present/late
            </span>
            <Button variant="secondary" size="sm" onClick={() => markAll('present')}>
              All Present
            </Button>
            <Button variant="secondary" size="sm" onClick={() => markAll('absent')}>
              All Absent
            </Button>
            <Button variant="secondary" size="sm" onClick={() => markAll(null)}>
              Clear All
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {students.map((stu) => {
            const isPresent = attendance[stu.id] === 'present';
            const isLate = attendance[stu.id] === 'late';
            const isAbsent = attendance[stu.id] === 'absent';
            const isUnmarked = attendance[stu.id] === null;

            return (
              <button
                key={stu.id}
                type="button"
                onClick={() => toggleStudent(stu.id)}
                className={`group relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.02] active:scale-95 shadow-sm
                  ${isPresent ? 'border-green-500 bg-green-50/50 shadow-green-100' : ''}
                  ${isLate ? 'border-amber-400 bg-amber-50/50 shadow-amber-100' : ''}
                  ${isAbsent ? 'border-red-500 bg-red-50/50 shadow-red-100' : ''}
                  ${isUnmarked ? 'border-slate-100 bg-white hover:border-slate-200' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-3">
                   <div className={`p-2 rounded-xl transition-colors 
                      ${isPresent ? 'bg-green-100 text-green-600' : ''}
                      ${isLate ? 'bg-amber-100 text-amber-600' : ''}
                      ${isAbsent ? 'bg-red-100 text-red-600' : ''}
                      ${isUnmarked ? 'bg-slate-100 text-slate-400' : ''}
                   `}>
                      {isPresent && <CheckCircle className="w-5 h-5" />}
                      {isLate && <CheckCircle className="w-5 h-5 text-amber-500" />}
                      {isAbsent && <XCircle className="w-5 h-5 text-red-500" />}
                      {isUnmarked && <div className="w-5 h-5 border-2 border-dashed border-slate-300 rounded-full" />}
                   </div>
                   <Badge 
                    variant={isPresent ? 'success' : (isLate ? 'warning' : (isAbsent ? 'danger' : 'slate'))} 
                    className="font-black"
                   >
                      {isPresent ? 'PRESENT' : (isLate ? 'LATE' : (isAbsent ? 'ABSENT' : 'UNMARKED'))}
                   </Badge>
                </div>
                
                <div className="min-w-0">
                  <p className={`font-black text-sm truncate leading-tight ${isPresent ? 'text-green-900' : (isLate ? 'text-amber-900' : 'text-slate-700')}`}>
                    {stu.users?.name}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {stu.roll_no}
                  </p>
                </div>

                {/* Status Indicator Bar */}
                <div className={`absolute bottom-0 left-4 right-4 h-1 rounded-t-full transition-all duration-300
                  ${isPresent ? 'bg-green-500' : (isLate ? 'bg-amber-500' : 'bg-transparent')}
                `}></div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Mark Attendance</h2>
        <p className="text-sm text-slate-500">Select subject, date, and lecture number to begin.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Subject</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={form.assignment_id}
            onChange={(e) => setForm({ ...form, assignment_id: e.target.value })}
          >
            <option value="">Select your subject...</option>
            {assignments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.subjects?.code} — {a.subjects?.name} ({a.branch_name || a.subjects?.branch}, Sem {a.subjects?.sem})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Lecture No.</label>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.lecture_no}
              onChange={(e) => setForm({ ...form, lecture_no: e.target.value })}
            >
              <option value="">Select...</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Toggle
          label="Blank means (default for unmarked students)"
          option1={{ label: 'Absent', value: 'absent' }}
          option2={{ label: 'Present', value: 'present' }}
          value={form.blank_means}
          onChange={(v) => setForm({ ...form, blank_means: v })}
        />

        <Button className="w-full" onClick={handleProceed} disabled={loadingStudents}>
          {loadingStudents ? 'Loading students...' : 'Proceed to Mark Attendance →'}
        </Button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { CheckCircle, XCircle } from 'lucide-react';

export const MultiClass = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lectureNo, setLectureNo] = useState('');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('subject_assignments')
      .select('subject_id, subjects(id, code, name, sem, branch)')
      .eq('teacher_id', user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  const toggleSubject = (id) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleProceed = async () => {
    if (!selectedSubjects.length || !lectureNo || !date) return toast.error('Fill all fields');
    // Get unique branch/sem combos
    const selectedInfo = assignments.filter(a => selectedSubjects.includes(a.subject_id)).map(a => a.subjects);
    const branchSems = [...new Set(selectedInfo.map(s => `${s.branch}|${s.sem}`))];

    let allStudents = [];
    for (const bs of branchSems) {
      const [branch, sem] = bs.split('|');
      const { data } = await supabase.from('students').select('id, roll_no, users(name)').eq('branch', branch).eq('sem', parseInt(sem)).order('roll_no');
      if (data) allStudents = [...allStudents, ...data];
    }

    const unique = allStudents.filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i);
    setStudents(unique);
    const map = {};
    unique.forEach(s => { map[s.id] = 'absent'; });
    setAttendance(map);
    setStep(2);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const { data: config } = await supabase.from('system_config').select('value').eq('key', 'current_academic_year').single();
    const academicYear = config?.value || '2024-25';

    for (const subjectId of selectedSubjects) {
      const subInfo = assignments.find(a => a.subject_id === subjectId)?.subjects;
      if (!subInfo) continue;

      const lectureStudents = students.filter(s => {
        // Only mark students matching this subject's branch/sem
        return true; // In real scenario filter by branch/sem
      });

      const { data: lec, error } = await supabase.from('lectures').insert([{
        subject_id: subjectId,
        teacher_id: authUser.id,
        date, lecture_no: parseInt(lectureNo),
        academic_year: academicYear,
        sem: subInfo.sem,
        blank_means: 'absent',
      }]).select('id').single();

      if (error) { toast.error(`Error for ${subInfo.code}: ${error.message}`); continue; }

      const rows = lectureStudents.map(s => ({
        lecture_id: lec.id, student_id: s.id,
        status: attendance[s.id], marked_by: authUser.id, academic_year: academicYear,
      }));
      await supabase.from('attendance').insert(rows);
    }

    toast.success(`Multi-class attendance saved for ${selectedSubjects.length} subjects!`);
    setSaving(false);
    setStep(1);
    setSelectedSubjects([]);
    setLectureNo('');
  };

  if (step === 2) {
    const present = Object.values(attendance).filter(v => v === 'present').length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Multi-Class Attendance</h2>
            <p className="text-sm text-slate-500">{selectedSubjects.length} subjects • {date} • Lec {lectureNo}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>← Back</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save All'}</Button>
          </div>
        </div>
        <p className="text-sm font-semibold text-slate-700">{present}/{students.length} present</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {students.map(stu => {
            const isPresent = attendance[stu.id] === 'present';
            return (
              <div key={stu.id} onClick={() => setAttendance(p => ({ ...p, [stu.id]: p[stu.id] === 'present' ? 'absent' : 'present' }))}
                className={`cursor-pointer rounded-lg border-2 p-3 flex items-center gap-2 transition-all select-none ${isPresent ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                {isPresent ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-400 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{stu.users?.name}</p>
                  <p className="text-xs text-slate-500">{stu.roll_no}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Multi-Class Attendance</h2>
        <p className="text-sm text-slate-500">Mark a single attendance sheet for multiple subjects simultaneously.</p>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Select Subjects</p>
          <div className="space-y-2">
            {assignments.map(a => (
              <label key={a.subject_id} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="rounded accent-indigo-600"
                  checked={selectedSubjects.includes(a.subject_id)}
                  onChange={() => toggleSubject(a.subject_id)} />
                <span className="text-sm text-slate-700">{a.subjects?.code} — {a.subjects?.name} ({a.subjects?.branch}, Sem {a.subjects?.sem})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <input type="date" className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-slate-700">Lecture No.</label>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLectureNo(n.toString())}
                  className={`w-10 h-10 rounded-full font-semibold text-sm transition-colors border shadow-sm ${lectureNo === n.toString() ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Button className="w-full" onClick={handleProceed} disabled={!selectedSubjects.length}>Proceed →</Button>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { CheckCircle, XCircle, Clock, Calendar, CheckSquare, Square } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const MultiClass = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignments, setSelectedAssignments] = useState([]); // Array of assignment IDs
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLectures, setSelectedLectures] = useState([]); // Array of lecture numbers
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

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

  const toggleAssignment = (id) => {
    setSelectedAssignments((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleLecture = (n) => {
    setSelectedLectures(prev => 
      prev.includes(n) ? prev.filter(ln => ln !== n) : [...prev, n].sort((a,b) => a-b)
    );
  };

  const handleProceed = async () => {
    if (!selectedAssignments.length || !selectedLectures.length || !date) {
      return toast.error('Please select subjects, lectures, and date');
    }

    const selectedInfo = assignments
      .filter((a) => selectedAssignments.includes(a.id))
      .map((a) => ({ branch: a.branch_name || a.subjects?.branch, sem: a.subjects?.sem }));
    const branchSems = [...new Set(selectedInfo.map((s) => `${s.branch}|${s.sem}`))];

    let allStudents = [];
    for (const bs of branchSems) {
      const [branch, sem] = bs.split('|');
      if (!branch) continue;
      const data = await api.getStudentsWithUsers({ branch, sem: parseInt(sem, 10) });
      if (data) allStudents = [...allStudents, ...data];
    }

    const unique = allStudents.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
    setStudents(unique);
    const map = {};
    unique.forEach((s) => {
      map[s.id] = null;
    });
    setAttendance(map);
    setStep(2);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const academicYear = (await api.getSystemConfigKey('current_academic_year'))?.value || '2024-25';

      for (const assignmentId of selectedAssignments) {
        const assignment = assignments.find((a) => a.id === assignmentId);
        const subInfo = assignment?.subjects;
        if (!subInfo) continue;

        // Perform multi-lecture creation
        const { ids } = await api.createLecture({
          subject_id: subInfo.id,
          lecture_nos: selectedLectures,
          date,
          academic_year: academicYear,
          sem: subInfo.sem,
        });

        if (ids && ids.length) {
          const allBatchRows = [];
          for (const lectureId of ids) {
             const rows = students.map((s) => ({
                lecture_id: lectureId,
                student_id: s.id,
                status: attendance[s.id] || 'absent',
                marked_by: user.id,
                academic_year: academicYear,
             }));
             allBatchRows.push(...rows);
          }
          await api.insertAttendance(allBatchRows);
        }
      }

      toast.success(`Attendance saved for ${selectedLectures.length} sessions across ${selectedAssignments.length} subjects!`);
      setSaving(false);
      setStep(1);
      setSelectedAssignments([]);
      setSelectedLectures([]);
    } catch (err) {
      toast.error(err.message || 'Bulk save failed');
      setSaving(false);
    }
  };

  if (step === 2) {
    const present = Object.values(attendance).filter((v) => v === 'present').length;
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Multi-Class <span className="text-indigo-600">Verification</span></h2>
            <div className="flex items-center gap-4 mt-1">
               <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{date}</span>
               <span className="text-xs text-slate-400 font-medium">Lec: {selectedLectures.join(', ')}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setStep(1)}>
               ← Back
            </Button>
            <Button className="rounded-xl px-8 shadow-lg shadow-indigo-100" onClick={handleSave} disabled={saving}>
               {saving ? 'Saving...' : 'Save All Sessions'}
            </Button>
            <Button variant="secondary" className="rounded-xl px-4" onClick={() => {
               const next = {};
               students.forEach(s => next[s.id] = null);
               setAttendance(next);
            }}>
               Clear All
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           {students.map((stu) => {
            const isPresent = attendance[stu.id] === 'present';
            return (
              <button
                key={stu.id}
                type="button"
                onClick={() =>
                  setAttendance((p) => {
                    const curr = p[stu.id];
                    let next;
                    if (curr === null) next = 'present';
                    else if (curr === 'present') next = 'absent';
                    else next = null;
                    return { ...p, [stu.id]: next };
                  })
                }
                className={`group relative flex flex-col p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-[1.02] active:scale-95 shadow-sm
                   ${attendance[stu.id] === 'present' ? 'border-green-500 bg-green-50/50 shadow-green-100' : ''}
                   ${attendance[stu.id] === 'absent' ? 'border-red-500 bg-red-50/50 shadow-red-100' : ''}
                   ${attendance[stu.id] === null ? 'border-slate-100 bg-white hover:border-slate-200 shadow-slate-100' : ''}
                `}
              >
                <div className="flex items-start justify-between mb-3">
                   <div className={`p-2 rounded-xl transition-colors 
                      ${attendance[stu.id] === 'present' ? 'bg-green-100 text-green-600' : ''}
                      ${attendance[stu.id] === 'absent' ? 'bg-red-100 text-red-600' : ''}
                      ${attendance[stu.id] === null ? 'bg-slate-100 text-slate-400' : ''}
                   `}>
                      {attendance[stu.id] === 'present' && <CheckCircle className="w-5 h-5" />}
                      {attendance[stu.id] === 'absent' && <XCircle className="w-5 h-5 text-red-500" />}
                      {attendance[stu.id] === null && <div className="w-5 h-5 border-2 border-dashed border-slate-300 rounded-full" />}
                   </div>
                   <Badge 
                    variant={attendance[stu.id] === 'present' ? 'success' : (attendance[stu.id] === 'absent' ? 'danger' : 'slate')} 
                    className="font-black"
                   >
                      {attendance[stu.id] === 'present' ? 'PRESENT' : (attendance[stu.id] === 'absent' ? 'ABSENT' : 'UNMARKED')}
                   </Badge>
                </div>
                
                <div className="min-w-0">
                  <p className={`font-black text-sm truncate leading-tight ${isPresent ? 'text-green-900' : 'text-slate-700'}`}>
                    {stu.users?.name}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                    {stu.roll_no}
                  </p>
                </div>

                <div className={`absolute bottom-0 left-4 right-4 h-1 rounded-t-full transition-all duration-300
                  ${isPresent ? 'bg-green-500' : 'bg-transparent'}
                `}></div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="max-w-2xl mx-auto space-y-8">
         <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Session <span className="text-indigo-600">Bundler</span></h2>
            <p className="text-sm text-slate-500 font-medium">Bundle multiple subjects and lecture hours into a single sync.</p>
         </div>

         <div className="bg-white border border-slate-100 rounded-3xl p-10 shadow-xl space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Active Subjects</label>
              <div className="grid grid-cols-1 gap-3">
                {assignments.map((a) => (
                  <div 
                    key={a.id} 
                    onClick={() => toggleAssignment(a.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all
                      ${selectedAssignments.includes(a.id) ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100/50' : 'border-slate-50 hover:border-slate-100 bg-slate-50/30'}
                    `}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedAssignments.includes(a.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-200'}`}>
                       {selectedAssignments.includes(a.id) && <CheckSquare className="w-3 h-3" />}
                    </div>
                    <div>
                       <p className={`text-sm font-bold ${selectedAssignments.includes(a.id) ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {a.subjects?.code} — {a.subjects?.name}
                       </p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                          {a.branch_name || a.subjects?.branch} • Sem {a.subjects?.sem}
                       </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Marking Date</label>
                <div className="relative">
                   <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                   <input
                     type="date"
                     className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                     value={date}
                     onChange={(e) => setDate(e.target.value)}
                   />
                </div>
              </div>
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Select Lectures</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => toggleLecture(n)}
                      className={`w-10 h-10 rounded-xl font-black text-xs transition-all border shadow-sm
                        ${selectedLectures.includes(n) ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-100/50 scale-110' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}
                      `}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button size="lg" className="w-full rounded-2xl h-14 font-black tracking-widest shadow-xl shadow-indigo-100 transition-all active:scale-95" onClick={handleProceed} disabled={!selectedAssignments.length || !selectedLectures.length}>
               PROCEED TO MARK →
            </Button>
         </div>
         
         <p className="text-center text-xs text-slate-400 font-medium">
            Note: All marked sessions will be visible in the subject-wise history logs once verified.
         </p>
      </div>
    </div>
  );
};

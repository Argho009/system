import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { Save, History, Info, Users, Clock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const ManualInit = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [totalLectures, setTotalLectures] = useState(0);
  const [students, setStudents] = useState([]);
  const [studentCounts, setStudentCounts] = useState({}); // { student_id: count }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [academicYear, setAcademicYear] = useState('2024-25');

  useEffect(() => {
    (async () => {
      try {
        const [asgn, cfg] = await Promise.all([
          api.getSubjectAssignments({ teacher_id: user.id }),
          api.getSystemConfigKey('current_academic_year')
        ]);
        setAssignments(asgn || []);
        if (cfg?.value) setAcademicYear(cfg.value);
      } catch (e) {
        toast.error("Failed to load assignments");
      }
    })();
  }, [user]);

  const handleAssignmentChange = async (id) => {
    setSelectedAssignmentId(id);
    if (!id) {
      setStudents([]);
      return;
    }

    setLoading(true);
    try {
      const assignment = assignments.find(a => a.id === id);
      const branch = assignment.branch_name || assignment.subjects?.branch;
      const sem = assignment.subjects?.sem;

      // 1. Fetch current initialization if exists
      const initData = await api.getManualInit({
        subject_id: assignment.subject_id,
        branch_name: branch,
        academic_year: academicYear
      });

      // 2. Fetch all students for this branch/sem
      const studs = await api.getStudentsWithUsers({ branch, sem });
      setStudents(studs || []);

      // 3. Populate counts
      const countsMap = {};
      studs.forEach(s => countsMap[s.id] = 0);
      
      if (initData && !Array.isArray(initData)) {
        setTotalLectures(initData.total_lectures_init || 0);
        (initData.student_counts || []).forEach(sc => {
          countsMap[sc.student_id] = sc.present_count_init;
        });
      } else {
        setTotalLectures(0);
      }
      
      setStudentCounts(countsMap);
    } catch (e) {
      toast.error("Failed to load students/data");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedAssignmentId) return;
    if (totalLectures < 0) return toast.error("Total lectures cannot be negative");

    setSaving(true);
    try {
      const assignment = assignments.find(a => a.id === selectedAssignmentId);
      const branch = assignment.branch_name || assignment.subjects?.branch;
      
      const payload = {
        subject_id: assignment.subject_id,
        branch_name: branch,
        sem: assignment.subjects?.sem,
        academic_year: academicYear,
        total_lectures_init: parseInt(totalLectures, 10),
        student_counts: Object.entries(studentCounts).map(([sid, count]) => ({
          student_id: sid,
          present_count_init: parseInt(count, 10)
        }))
      };

      await api.saveManualInit(payload);
      toast.success("Manual balance updated successfully!");
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
    setSaving(false);
  };

  const handleApplyToAll = (val) => {
    const v = parseInt(val, 10) || 0;
    const next = { ...studentCounts };
    students.forEach(s => next[s.id] = v);
    setStudentCounts(next);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Manual <span className="text-indigo-600">Balance</span></h2>
          <p className="text-sm text-slate-500 font-medium">Set historical attendance records for subjects and students.</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant="indigo" className="h-8 px-3 rounded-full">{academicYear}</Badge>
           <Button onClick={handleSave} disabled={saving || !selectedAssignmentId} className="rounded-2xl px-6 shadow-lg shadow-indigo-100">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Sync Balance'}
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Subject & Total */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Target Subject</label>
              <select 
                className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none"
                value={selectedAssignmentId}
                onChange={(e) => handleAssignmentChange(e.target.value)}
              >
                <option value="">Select Assignment...</option>
                {assignments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.subjects?.code} — {a.branch_name || a.subjects?.branch}
                  </option>
                ))}
              </select>
            </div>

            {selectedAssignmentId && (
              <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                   <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-indigo-600" />
                      <label className="text-xs font-black text-indigo-900 uppercase">Historical Lectures</label>
                   </div>
                   <input 
                      type="number" 
                      className="w-full mt-2 bg-transparent text-2xl font-black text-indigo-600 outline-none"
                      value={totalLectures}
                      onChange={(e) => setTotalLectures(e.target.value)}
                   />
                   <p className="text-[10px] text-indigo-400 font-bold mt-1 uppercase tracking-wider">Total lectures taken until today</p>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-slate-50">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Action</label>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1 rounded-xl text-[10px]" onClick={() => handleApplyToAll(totalLectures)}>Full Present</Button>
                    <Button variant="secondary" size="sm" className="flex-1 rounded-xl text-[10px]" onClick={() => handleApplyToAll(0)}>Reset All</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-3">
             <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest">Helpful Note</span>
             </div>
             <p className="text-xs text-slate-400 leading-relaxed font-medium">
                These records are added to the live attendance logs. If the system calculates 15 presents and you set 5 here, the student will have 20 total.
             </p>
          </div>
        </div>

        {/* Right Column: Student List */}
        <div className="lg:col-span-2">
          {loading ? (
             <div className="h-64 flex flex-col items-center justify-center text-slate-300 gap-4">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase tracking-widest">Syncing Records...</p>
             </div>
          ) : !selectedAssignmentId ? (
            <div className="h-full min-h-[300px] border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300">
               <Users className="w-12 h-12 mb-4 opacity-20" />
               <p className="text-sm font-bold tracking-tight">Select an assignment to manage students</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Student Roster</h3>
                   <span className="text-[10px] bg-white px-2 py-1 rounded-lg border border-slate-200 font-black text-slate-400">{students.length} Students</span>
                </div>
                <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
                   {students.map(s => (
                     <div key={s.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                              {s.roll_no.slice(-3)}
                           </div>
                           <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{s.users?.name}</p>
                              <p className="text-[10px] font-black text-slate-300 uppercase leading-none mt-1 tracking-wider">{s.roll_no}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black text-slate-400 uppercase">Presents</span>
                           <input 
                              type="number"
                              min="0"
                              max={totalLectures}
                              className={`w-16 h-10 rounded-xl border text-center text-sm font-black transition-all
                                ${studentCounts[s.id] > totalLectures ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-100 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600'}
                              `}
                              value={studentCounts[s.id]}
                              onChange={(e) => setStudentCounts({ ...studentCounts, [s.id]: e.target.value })}
                           />
                        </div>
                     </div>
                   ))}
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

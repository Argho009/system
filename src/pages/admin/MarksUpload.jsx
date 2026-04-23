import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { FileSpreadsheet, CheckCircle, AlertCircle, Save, User, Hash, Lock, Clock } from 'lucide-react';

export const MarksUpload = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Selection Context
  const [selection, setSelection] = useState({
    branch: '',
    sem: '',
    subject_id: '',
    test_name: '',
    max_marks: ''
  });

  const [branches, setBranches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [marksData, setMarksData] = useState({}); // { student_id: { marks, created_at, isLocked } }
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selection.branch && selection.sem) {
      fetchSubjects();
    }
  }, [selection.branch, selection.sem]);

  const fetchInitialData = async () => {
    try {
      const bData = await api.getBranches();
      setBranches(bData || []);
      const hData = await api.getBulkUploadLogs(80, 'marks');
      setHistory(hData || []);
    } catch {
      toast.error('Failed to load initial data');
    }
  };

  const fetchSubjects = async () => {
    try {
      const list = await api.getSubjects();
      const filtered = (list || []).filter(
        (s) => s.branch === selection.branch && String(s.sem) === String(selection.sem)
      );
      setSubjects(filtered.sort((a, b) => (a.code || '').localeCompare(b.code || '')));
    } catch {
      setSubjects([]);
    }
  };

  const initializeGrid = async () => {
    if (!selection.branch || !selection.sem || !selection.subject_id || !selection.test_name || !selection.max_marks) {
      toast.error('Please fill all context fields');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch Students
      const studentList = await api.getStudents({ branch: selection.branch, sem: selection.sem });
      setStudents(studentList || []);

      // 2. Fetch Existing Marks
      const existingMarks = await api.getCtMarks({ 
        subject_id: selection.subject_id, 
        test_name: selection.test_name 
      });

      // 3. Map to state
      const initialMarks = {};
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      (studentList || []).forEach(s => {
        const mark = (existingMarks || []).find(m => m.student_id === s.id);
        const createdAt = mark?.created_at ? new Date(mark.created_at) : null;
        
        initialMarks[s.id] = {
          marks: mark?.marks_obtained ?? '',
          created_at: mark?.created_at || null,
          isLocked: createdAt ? createdAt < sevenDaysAgo : false
        };
      });

      setMarksData(initialMarks);
      setStep(2);
    } catch (err) {
      toast.error('Failed to initialize grid');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (studentId, value) => {
    if (marksData[studentId]?.isLocked) return;
    
    // Validate value
    const num = parseFloat(value);
    if (value !== '' && (isNaN(num) || num < 0 || num > parseFloat(selection.max_marks))) {
       // Just visual warning or ignore? Let's ignore invalid numeric input
       if (!isNaN(num)) {
          toast.error(`Marks must be between 0 and ${selection.max_marks}`);
          return;
       }
    }

    setMarksData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks: value }
    }));
  };

  const handleSaveMarks = async () => {
    setLoading(true);
    try {
      const academic_year = (await api.getSystemConfigKey('academic_year'))?.value || '2024-25';

      const rows = students
        .filter(s => marksData[s.id]?.marks !== '' && !marksData[s.id]?.isLocked)
        .map(s => ({
          student_id: s.id,
          subject_id: selection.subject_id,
          test_name: selection.test_name,
          marks_obtained: parseFloat(marksData[s.id].marks),
          max_marks: parseFloat(selection.max_marks),
          academic_year,
          uploaded_by: user.id
        }));

      if (rows.length === 0) {
        toast.info('No changes to save');
        setLoading(false);
        return;
      }

      await api.upsertCtMarks(rows);

      // Create a log entry
      await api.createBulkUploadLog({
        file_name: `Manual Update: ${selection.test_name} - ${selection.branch}`,
        type: 'marks',
        status: 'completed'
      });

      toast.success('Marks saved successfully');
      setStep(3);
      fetchInitialData();
    } catch (err) {
      toast.error(err.message || 'Failed to save marks');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setStudents([]);
    setMarksData({});
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Marks <span className="text-indigo-600">Architect</span></h2>
          <p className="text-sm text-slate-500 font-medium">Direct manual entry system with 7-day security lock.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-500" />
              <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-widest leading-none">
                 7-Day Edit<br/>Window Active
              </div>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        {/* Step Indicators */}
        <div className="flex border-b border-slate-50">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex-1 flex items-center justify-center py-4 text-[10px] font-black tracking-[0.2em] gap-3 transition-all ${step === i ? 'bg-indigo-50/50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-300'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${step === i ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200'}`}>{i}</div>
              {i === 1 ? 'CONTEXT' : i === 2 ? 'ENTRY GRID' : 'RESULT'}
            </div>
          ))}
        </div>

        <div className="p-10">
          {step === 1 && (
            <div className="space-y-8 max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Branch</label>
                  <select 
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    value={selection.branch}
                    onChange={e => setSelection({...selection, branch: e.target.value})}
                  >
                    <option value="">Select Branch...</option>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Semester</label>
                  <select 
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    value={selection.sem}
                    onChange={e => setSelection({...selection, sem: e.target.value})}
                  >
                    <option value="">Select Sem...</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Subject</label>
                  <select 
                     className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 transition-all outline-none disabled:opacity-50"
                     value={selection.subject_id}
                     onChange={e => setSelection({...selection, subject_id: e.target.value})}
                     disabled={!selection.branch || !selection.sem}
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Input 
                      label="Test Name" 
                      placeholder="CT1" 
                      className="rounded-2xl"
                      value={selection.test_name}
                      onChange={e => setSelection({...selection, test_name: e.target.value})}
                   />
                   <Input 
                      label="Max Marks" 
                      type="number" 
                      placeholder="40"
                      className="rounded-2xl"
                      value={selection.max_marks}
                      onChange={e => setSelection({...selection, max_marks: e.target.value})}
                   />
                </div>
              </div>

              <div className="pt-6 flex justify-center">
                 <Button 
                    size="lg"
                    className="px-12 rounded-2xl shadow-xl shadow-indigo-100 font-bold"
                    disabled={!selection.subject_id || !selection.test_name || !selection.max_marks || loading}
                    onClick={initializeGrid}
                 >
                   {loading ? 'Initializing...' : 'Open Entry Grid'}
                 </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="flex flex-wrap justify-between items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100 gap-6">
                  <div className="flex gap-8">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Target Class</span> 
                      <p className="text-sm font-black text-slate-900">{selection.branch} - Sem {selection.sem}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Assessment</span> 
                      <p className="text-sm font-black text-slate-900">{selection.test_name} ({selection.max_marks} Marks)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="ghost" className="rounded-xl" onClick={reset}>Cancel</Button>
                    <Button className="rounded-xl px-8 shadow-lg shadow-indigo-100" onClick={handleSaveMarks} disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving Changes...' : 'Save & Publish'}
                    </Button>
                  </div>
               </div>

               <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-100">
                 <table className="w-full text-sm text-left border-collapse">
                   <thead className="bg-slate-50/50 backdrop-blur-sm border-b border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                         <th className="px-8 py-5 w-24">Roll</th>
                         <th className="px-8 py-5">Student Identity</th>
                         <th className="px-8 py-5 text-center w-48">Score Entry</th>
                         <th className="px-8 py-5 text-right w-32">Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      {students.map((s) => {
                        const data = marksData[s.id];
                        return (
                          <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-4 font-black text-slate-900">{s.roll_no}</td>
                            <td className="px-8 py-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                     <User className="w-4 h-4 text-indigo-400" />
                                  </div>
                                  <span className="font-bold text-slate-700">{s.users?.name}</span>
                               </div>
                            </td>
                            <td className="px-8 py-4">
                               <div className="relative group/input">
                                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 group-focus-within/input:text-indigo-500 transition-colors" />
                                  <input 
                                    type="number"
                                    max={selection.max_marks}
                                    min="0"
                                    step="0.5"
                                    disabled={data?.isLocked || loading}
                                    className={`w-full pl-8 pr-4 py-2 text-center font-black rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all
                                      ${data?.isLocked ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-800'}
                                    `}
                                    value={data?.marks}
                                    onChange={(e) => handleMarkChange(s.id, e.target.value)}
                                  />
                               </div>
                            </td>
                            <td className="px-8 py-4 text-right">
                               {data?.isLocked ? (
                                 <Badge variant="warning" className="rounded-full px-3 py-1">
                                    <Lock className="w-3 h-3 mr-1.5 inline" />
                                    LOCKED
                                 </Badge>
                               ) : (
                                 <Badge variant="success" className="rounded-full px-3 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    EDITABLE
                                 </Badge>
                               )}
                            </td>
                          </tr>
                        );
                      })}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-12 text-center animate-in zoom-in-95 duration-500">
               <div className="relative mb-8">
                  <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                  <CheckCircle className="h-16 w-16 text-green-500 relative z-10" />
               </div>
               <h3 className="text-3xl font-black text-slate-900 tracking-tight">Records <span className="text-green-600">Archived</span></h3>
               <p className="text-slate-500 font-medium mt-2 mb-10 max-w-xs mx-auto">
                 Internal assessment marks have been successfully committed to the primary database.
               </p>
               <Button size="lg" className="rounded-2xl px-12 shadow-xl shadow-green-100" onClick={reset}>Complete Workflow</Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 pl-2">
           <clock className="w-4 h-4 text-slate-400" />
           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment History</h3>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <Table 
          columns={[
             { header: 'Action Log', accessor: 'file_name', render: (row) => <span className="font-bold text-slate-700">{row.file_name}</span> },
             { header: 'Architect', accessor: 'users', render: (row) => <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">{row.users?.name?.charAt(0)}</div>{row.users?.name || 'System'}</div> },
             { header: 'Timestamp', accessor: 'created_at', render: (row) => <span className="text-slate-400 font-medium">{new Date(row.created_at).toLocaleString('en-IN')}</span> },
             { header: 'Status', accessor: 'status', render: (row) => <Badge variant="success" className="rounded-xl px-4">{row.status.toUpperCase()}</Badge> }
          ]}
          data={history}
          emptyMessage="No previous assessment transitions found."
        />
        </div>
      </div>
    </div>
  );
};

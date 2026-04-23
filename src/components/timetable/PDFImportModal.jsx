import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { FileDown, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, X, Info, FileText, Settings, Upload, User, GraduationCap } from 'lucide-react';
import { parseTimetablePDF } from '../../utils/timetableParser';

export const PDFImportModal = ({ isOpen, onClose, onSaved, branches, sems, subjects }) => {
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [branch, setBranch] = useState(branches[0]?.name || '');
  const [sem, setSem] = useState('1');
  const [importMode, setImportMode] = useState('student'); // 'student' or 'teacher'
  const [globalTeacherName, setGlobalTeacherName] = useState('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [parsedData, setParsedData] = useState(null);
  const [editableGrid, setEditableGrid] = useState([]);
  const [unmatchedSubjects, setUnmatchedSubjects] = useState([]);
  
  const [editingCell, setEditingCell] = useState(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellRoom, setCellRoom] = useState('');
  const [cellTeacher, setCellTeacher] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setFile(null);
      setParsedData(null);
      setUnmatchedSubjects([]);
      if (!branch && branches && branches.length > 0) {
        setBranch(branches[0].name);
      }
    }
  }, [isOpen, branches, branch]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleScan = async () => {
    if (!file) { toast.error("Please select a file"); return; }
    if (!branch) { toast.error("Please select a branch"); return; }
    if (!sem) { toast.error("Please select a semester"); return; }
    if (importMode === 'teacher' && !globalTeacherName) {
       toast.error("Please enter the teacher's name for stamping.");
       return;
    }
    
    setStep(3);
    setIsScanning(true);
    try {
      const result = await parseTimetablePDF(file);
      setParsedData(result);
      
      if (result.slots.length === 0) {
        setStep(5);
      } else {
        const grid = [];
        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        DAYS.forEach(d => {
          const row = { day: d, slots: Array(8).fill(null) };
          for (let i=1; i<=8; i++) {
             const found = result.slots.find(s => s.day === d && s.lecture_no === i);
             if (found) {
               row.slots[i-1] = { 
                  subject_code: found.subject_code, 
                  room: found.room,
                  teacher_name: importMode === 'teacher' ? globalTeacherName : '' 
               };
             }
          }
          grid.push(row);
        });
        setEditableGrid(grid);
        setStep(4);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse PDF: ' + err.message);
      setStep(5);
    } finally {
      setIsScanning(false);
    }
  };

  const updateCellRealtime = (subjectVal, roomVal, teacherVal, dayIdx, colIdx) => {
    const newGrid = [...editableGrid];
    if (!subjectVal.trim() && !roomVal.trim() && !teacherVal.trim()) {
      newGrid[dayIdx].slots[colIdx] = null;
    } else {
      newGrid[dayIdx].slots[colIdx] = {
        subject_code: subjectVal,
        room: roomVal,
        teacher_name: teacherVal
      };
    }
    setEditableGrid(newGrid);
  };

  const handleSaveToDB = async () => {
    const msg = importMode === 'student' 
       ? `Full Overwrite: This will DELETE existing schedule for ${branch} Sem ${sem} and re-insert fresh.`
       : `Teacher Overwrite: This will only update the teacher assignments for ${branch} Sem ${sem}. Existing subjects/rooms stay same.`;
    
    if (!confirm(msg + "\n\nContinue?")) return;
    
    setStep(6);
    setIsSaving(true);
    let successCount = 0;

    try {
      const preparedSlots = [];
      editableGrid.forEach(row => {
        row.slots.forEach((cell, idx) => {
          if (cell) {
             preparedSlots.push({
               day_of_week: row.day,
               lecture_no: idx + 1,
               subject_code: cell.subject_code,
               room: cell.room,
               teacher_name: cell.teacher_name
             });
          }
        });
      });

      await api.batchUpsertTimetable({
        branch,
        sem: parseInt(sem, 10),
        mode: importMode,
        slots: preparedSlots
      });

      successCount = preparedSlots.length;
      toast.success(`${successCount} slots processed successfully.`);
      setStep(7);
      
    } catch (err) {
      console.error(err);
      toast.error('Error saving to DB: ' + err.message);
      setStep(4);
    } finally {
      setIsSaving(false);
    }
  };

  const renderContent = () => {
    if (step === 1) {
      return (
        <div className="p-8 space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex items-center gap-4 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
              <div className="bg-white p-3 rounded-2xl shadow-sm h-fit text-indigo-600">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-indigo-950 tracking-tight">Timetable Import Engine</h4>
                <p className="text-xs text-indigo-600/80 font-medium leading-relaxed">
                   Select the import mode based on the PDF format (Section-wise vs Teacher-wise).
                </p>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div onClick={() => setImportMode('student')} className={`cursor-pointer p-4 border-2 rounded-2xl transition-all flex flex-col items-center gap-2 ${importMode === 'student' ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <GraduationCap className={`w-6 h-6 ${importMode === 'student' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black uppercase tracking-widest text-slate-800">Student Mode</span>
                <p className="text-[10px] text-center text-slate-400 font-medium">Full overwrite by Section</p>
             </div>
             <div onClick={() => setImportMode('teacher')} className={`cursor-pointer p-4 border-2 rounded-2xl transition-all flex flex-col items-center gap-2 ${importMode === 'teacher' ? 'border-indigo-600 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <User className={`w-6 h-6 ${importMode === 'teacher' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black uppercase tracking-widest text-slate-800">Teacher Mode</span>
                <p className="text-[10px] text-center text-slate-400 font-medium">Update only teacher slots</p>
             </div>
          </div>

          <div className="space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 pl-1">Configuration</h5>
            <div className={`grid ${importMode === 'teacher' ? 'grid-cols-3' : 'grid-cols-2'} gap-4`}>
               <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Target Branch</label>
                  <select className="w-full bg-transparent border-0 font-black text-slate-800 text-sm focus:ring-0 p-0" value={branch} onChange={e => setBranch(e.target.value)}>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
               </div>
               <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Semester</label>
                  <select className="w-full bg-transparent border-0 font-black text-slate-800 text-sm focus:ring-0 p-0" value={sem} onChange={e => setSem(e.target.value)}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
               </div>
               {importMode === 'teacher' && (
                  <div className="p-3 bg-white border-2 border-indigo-200 rounded-2xl shadow-sm animate-in slide-in-from-right-2">
                     <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1 pl-1">Teacher Name</label>
                     <input 
                        type="text" 
                        placeholder="Ex: Rajesh" 
                        className="w-full bg-transparent border-0 font-black text-indigo-900 text-sm focus:ring-0 p-0 placeholder:text-indigo-200"
                        value={globalTeacherName}
                        onChange={e => setGlobalTeacherName(e.target.value)}
                     />
                  </div>
               )}
            </div>
          </div>

          <div className="relative group overflow-hidden">
            <div className={`relative border-2 border-dashed rounded-[2rem] p-12 transition-all flex flex-col items-center justify-center gap-4 cursor-pointer
              ${file ? 'border-indigo-400 bg-indigo-50/50 shadow-inner' : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300'}
            `}>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <div className={`p-4 rounded-2xl shadow-sm ${file ? 'bg-indigo-600 scale-110' : 'bg-white'} transition-all duration-500`}>
                <Upload className={`w-8 h-8 ${file ? 'text-white' : 'text-slate-300'}`} />
              </div>
              <div className="text-center">
                 <p className={`font-black tracking-tight ${file ? 'text-indigo-900 text-lg' : 'text-slate-500'}`}>
                    {file ? file.name : 'Drop Timetable PDF'}
                 </p>
                 {!file && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Accepts only digital .pdf files</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center bg-slate-50/80 p-4 -mx-8 -mb-8 mt-10 rounded-b-3xl border-t border-slate-100">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4">
                <Settings className="w-3 h-3" />
                Mode: {importMode}
             </div>
             <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancel</Button>
                <Button disabled={!file} onClick={handleScan} className="rounded-xl px-8 shadow-lg shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700">Initialize Scan</Button>
             </div>
          </div>
        </div>
      );
    }

    if (step === 3 || step === 6) {
      return (
        <div className="p-20 flex flex-col items-center justify-center space-y-6">
           <div className="relative">
              <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
              <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin relative z-10" />
           </div>
           <div className="text-center space-y-2">
              <h4 className="text-xl font-black text-slate-900 tracking-tight">
                {step === 3 ? 'Deep Scanning PDF...' : 'Deploying Schedule...'}
              </h4>
              <p className="text-sm font-medium text-slate-400 max-w-xs leading-relaxed">
                 Updating relational nodes for {branch} sem {sem}.
              </p>
           </div>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="p-8 space-y-6">
          <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2rem] flex flex-col items-center text-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm text-rose-500">
               <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-rose-950 text-xl tracking-tight">Extraction Failed</h4>
              <p className="text-sm text-rose-600/80 font-medium max-w-xs">
                 We couldn't detect a digital grid structure in this file. It might be an image-based scan.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
             <Button variant="outline" onClick={() => setStep(1)} className="rounded-xl">Try Another File</Button>
             <Button onClick={onClose} className="rounded-xl bg-slate-900">Close Engine</Button>
          </div>
        </div>
      );
    }

    if (step === 4) {
      let count = 0;
      editableGrid.forEach(r => { r.slots.forEach(s => { if(s) count++ }) });
      
      return (
        <div className="p-0 flex flex-col max-h-[85vh] overflow-hidden bg-white">
          <div className="p-8 pb-4 border-b border-slate-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="font-black text-slate-900 text-xl tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
                Detection <span className="text-indigo-600">Review</span>
              </h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {count} Nodes Found ({importMode} mode)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
               <Info className="w-3.5 h-3.5 text-indigo-500" />
               Manual correction enabled
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4 bg-slate-50/30">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
            <table className="w-full text-[10px] text-left min-w-[700px] border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 uppercase tracking-tighter text-slate-400 font-black">
                  <th className="p-4 border-r border-slate-100 sticky left-0 bg-slate-50 z-10 w-24 text-center">Day</th>
                  {[1,2,3,4,5,6,7,8].map(l => <th key={l} className="p-4 border-r border-slate-100 text-center">Lec {l}</th>)}
                </tr>
              </thead>
              <tbody>
                {editableGrid.map((row, rIdx) => (
                  <tr key={row.day} className="border-b border-slate-50 last:border-0 group hover:bg-slate-50/50">
                    <td className="p-4 border-r border-slate-100 font-black text-slate-900 sticky left-0 bg-white z-10 uppercase text-center">{row.day.substring(0,3)}</td>
                    {row.slots.map((cell, cIdx) => (
                      <td key={cIdx} 
                          className="p-1 border-r border-slate-50 text-center group/cell cursor-pointer relative"
                          onClick={() => {
                            setCellSubject(cell?.subject_code || '');
                            setCellRoom(cell?.room || '');
                            setCellTeacher(cell?.teacher_name || globalTeacherName);
                            setEditingCell({ dayIdx: rIdx, colIdx: cIdx });
                          }}>
                        <div className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all duration-300 h-20
                           ${cell ? 'bg-white border-slate-100 shadow-sm group-hover/cell:scale-105 group-hover/cell:border-indigo-200' : 'bg-slate-50/10 border-transparent'}
                        `}>
                          {cell ? (
                            <>
                              <span className="font-black text-slate-800 tracking-tighter text-xs leading-none mb-1">{cell.subject_code}</span>
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{cell.room || '—'}</span>
                                 <span className="text-[8px] font-black text-indigo-600 uppercase tracking-tighter leading-none">{cell.teacher_name || '—'}</span>
                              </div>
                            </>
                          ) : <div className="w-1 h-1 rounded-full bg-slate-200" />}
                        </div>
                        
                        {editingCell?.dayIdx === rIdx && editingCell?.colIdx === cIdx && (
                          <div className="absolute top-1/2 left-full -translate-x-12 ml-2 w-56 -translate-y-1/2 bg-white shadow-2xl border border-slate-100 rounded-2xl p-4 z-[100] text-left animate-in fade-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Edit Node</span>
                              <button onClick={() => setEditingCell(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                <X className="w-4 h-4 text-slate-400" />
                              </button>
                            </div>
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 pl-1 uppercase tracking-widest">Sub Code</label>
                                <input 
                                  type="text" 
                                  className="w-full text-xs font-black p-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase" 
                                  value={cellSubject} 
                                  onChange={e => {
                                    setCellSubject(e.target.value);
                                    updateCellRealtime(e.target.value, cellRoom, cellTeacher, rIdx, cIdx);
                                  }} 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 pl-1 uppercase tracking-widest">Room</label>
                                <input 
                                  type="text" 
                                  className="w-full text-xs font-black p-2 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase" 
                                  value={cellRoom} 
                                  onChange={e => {
                                    setCellRoom(e.target.value);
                                    updateCellRealtime(cellSubject, e.target.value, cellTeacher, rIdx, cIdx);
                                  }} 
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-indigo-400 pl-1 uppercase tracking-widest">Teacher</label>
                                <input 
                                  type="text" 
                                  className="w-full text-xs font-black p-2 bg-indigo-50 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase" 
                                  value={cellTeacher} 
                                  onChange={e => {
                                    setCellTeacher(e.target.value);
                                    updateCellRealtime(cellSubject, cellRoom, e.target.value, rIdx, cIdx);
                                  }} 
                                />
                              </div>
                              <div className="flex gap-2 pt-1 border-t border-slate-50 mt-2">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  updateCellRealtime('', '', '', rIdx, cIdx);
                                  setEditingCell(null);
                                }} className="flex-1 text-[10px] font-black text-rose-500">Delete</Button>
                                <Button size="sm" onClick={() => setEditingCell(null)} className="flex-1 rounded-xl shadow-lg shadow-indigo-100 bg-indigo-600">Done</Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          <div className="p-8 bg-white border-t border-slate-100 flex justify-between items-center rounded-b-3xl">
             <Button variant="ghost" onClick={() => setStep(1)} className="rounded-xl">Start Over</Button>
             <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSaveToDB} className="rounded-xl px-10 shadow-xl shadow-indigo-100 bg-indigo-600 text-white font-black">Commit Schedule</Button>
             </div>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div className="p-12 space-y-8 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
                <div className="absolute -inset-4 bg-green-500/20 rounded-full blur-xl"></div>
                <CheckCircle2 className="w-16 h-16 text-green-500 relative z-10" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Sync Complete</h3>
              <p className="text-sm font-medium text-slate-400">Changes are now reflected on global dashboards.</p>
            </div>
          </div>

          <Button onClick={() => { onClose(); onSaved(); }} className="w-full py-6 text-lg font-black rounded-2xl shadow-2xl shadow-indigo-100 bg-slate-900">
             Finish & View
          </Button>
        </div>
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Timetable PDF Engine" className="max-w-4xl p-0 overflow-hidden rounded-[3rem] border-0">
      {renderContent()}
    </Modal>
  );
};

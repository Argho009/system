import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { toast } from '../ui/Toast';
import { FileDown, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, X, Edit2 } from 'lucide-react';
import { parseTimetablePDF } from '../../utils/timetableParser';

export const PDFImportModal = ({ isOpen, onClose, onSaved, branches, sems, subjects }) => {
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [branch, setBranch] = useState(branches[0]?.name || '');
  const [sem, setSem] = useState('1');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [parsedData, setParsedData] = useState(null);
  const [editableGrid, setEditableGrid] = useState([]);
  const [unmatchedSubjects, setUnmatchedSubjects] = useState([]);
  
  // For individual cell editing
  const [editingCell, setEditingCell] = useState(null);
  const [cellSubject, setCellSubject] = useState('');
  const [cellRoom, setCellRoom] = useState('');

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
    
    setStep(3);
    setIsScanning(true);
    try {
      const result = await parseTimetablePDF(file);
      setParsedData(result);
      
      if (result.slots.length === 0) {
        setStep(5);
      } else {
        // Build editable grid state
        const grid = [];
        const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        DAYS.forEach(d => {
          const row = { day: d, slots: Array(8).fill(null) };
          for (let i=1; i<=8; i++) {
             const found = result.slots.find(s => s.day === d && s.lecture_no === i);
             if (found) {
               row.slots[i-1] = { subject_code: found.subject_code, room: found.room };
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

  const updateCellRealtime = (subjectVal, roomVal, dayIdx, colIdx) => {
    const newGrid = [...editableGrid];
    if (!subjectVal.trim() && !roomVal.trim()) {
      newGrid[dayIdx].slots[colIdx] = null;
    } else {
      newGrid[dayIdx].slots[colIdx] = {
        subject_code: subjectVal,
        room: roomVal
      };
    }
    setEditableGrid(newGrid);
  };

  const handleSaveToDB = async () => {
    if (!confirm(`This will overwrite existing timetable slots for ${branch} Sem ${sem}. Continue?`)) return;
    
    setStep(6);
    setIsSaving(true);
    let successCount = 0;
    let unmatched = new Set();

    try {
      // Collect valid slots from grid
      const slotsToSave = [];
      editableGrid.forEach(row => {
        row.slots.forEach((cell, idx) => {
          if (cell) {
             slotsToSave.push({
               day: row.day,
               lecture_no: idx + 1,
               subject_code: cell.subject_code,
               room: cell.room
             });
          }
        });
      });

      for (let slot of slotsToSave) {
        // Find subject ID case-insensitive
        const matchedSubj = subjects.find(s => s.code.toLowerCase() === slot.subject_code.toLowerCase());
        let subject_id = null;
        
        if (matchedSubj) {
          subject_id = matchedSubj.id;
        } else {
          unmatched.add(slot.subject_code);
        }

        const { error } = await supabase.from('timetable').upsert({
          branch,
          sem: parseInt(sem),
          day_of_week: slot.day,
          lecture_no: slot.lecture_no,
          subject_id,
          room: slot.room,
          teacher_id: null // Require manual teacher assignment later or map subject_assignments
        }, { onConflict: 'branch,sem,day_of_week,lecture_no' });

        if (error) throw error;
        
        await supabase.from('timetable_change_log').insert({
          branch, sem: parseInt(sem), day_of_week: slot.day, lecture_no: slot.lecture_no,
          changed_by: user.id,
          change_description: `Imported ${slot.subject_code} from PDF`
        });
        
        successCount++;
      }

      setUnmatchedSubjects(Array.from(unmatched));
      toast.success(`${successCount} slots imported successfully.`);
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
    if (step === 1 || step === 2) {
      return (
        <div className="space-y-5">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded text-sm flex gap-3">
            <InfoIcon className="w-5 h-5 text-blue-500 shrink-0" />
            <p>This works best with digitally created PDFs (Word/Excel exports). Scanned or photographed timetables may not be detected correctly.</p>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 flex flex-col items-center justify-center bg-slate-50 relative">
            <input 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <FileDown className="w-10 h-10 text-slate-400 mb-3" />
            {file ? (
              <p className="text-sm font-semibold text-indigo-700">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">Drag PDF here or click to browse</p>
                <p className="text-xs text-slate-500 mt-1">Accepts .pdf files only</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Target Branch</label>
              <select className="w-full border-slate-300 rounded p-2 text-sm" value={branch} onChange={e => setBranch(e.target.value)}>
                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Semester</label>
              <select className="w-full border-slate-300 rounded p-2 text-sm" value={sem} onChange={e => setSem(e.target.value)}>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={!file} onClick={handleScan}>Scan PDF</Button>
          </div>
        </div>
      );
    }

    if (step === 3 || step === 6) {
      return (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="font-medium text-slate-700">
            {step === 3 ? 'Reading PDF... this may take a few seconds' : 'Saving to Database...'}
          </p>
          {step === 3 && (
            <div className="text-xs text-slate-500 space-y-1 text-center">
              <p>✓ Loading PDF</p>
              <p className="animate-pulse">⟳ Extracting table coordinates...</p>
            </div>
          )}
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-800">Could not detect timetable structure.</h4>
              <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc pl-4">
                <li>Make sure the PDF was created digitally, not scanned.</li>
                <li>Try copy-pasting the timetable text into a Word doc and re-exporting as PDF.</li>
                <li>Or fill the timetable manually using the grid.</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      );
    }

    if (step === 4) {
      let count = 0;
      editableGrid.forEach(r => { r.slots.forEach(s => { if(s) count++ }) });
      
      return (
        <div className="space-y-4 max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Preview Grid
            </h4>
            <span className="text-sm text-slate-500">{count} slots detected • {parsedData?.confidence} confidence</span>
          </div>
          
          <p className="text-xs text-slate-500 px-1">
            Review all cells before saving. Incorrect detections can be fixed by clicking any cell.
          </p>

          <div className="flex-1 overflow-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-2 border-r sticky left-0 bg-slate-50">DAY</th>
                  {[1,2,3,4,5,6,7,8].map(l => <th key={l} className="p-2 border-r text-center">Lec {l}</th>)}
                </tr>
              </thead>
              <tbody>
                {editableGrid.map((row, rIdx) => (
                  <tr key={row.day} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-2 border-r font-medium sticky left-0 bg-white">{row.day.substring(0,3)}</td>
                    {row.slots.map((cell, cIdx) => (
                      <td key={cIdx} 
                          className="p-1 border-r text-center cursor-pointer hover:bg-indigo-50 relative group"
                          onClick={() => {
                            setCellSubject(cell?.subject_code || '');
                            setCellRoom(cell?.room || '');
                            setEditingCell({ dayIdx: rIdx, colIdx: cIdx });
                          }}>
                        {cell ? (
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-slate-800 truncate max-w-[60px]">{cell.subject_code}</span>
                            {cell.room && <span className="text-[9px] text-slate-500 truncate max-w-[60px]">{cell.room}</span>}
                          </div>
                        ) : <span className="text-slate-300">—</span>}
                        
                        {/* Editor popover */}
                        {editingCell?.dayIdx === rIdx && editingCell?.colIdx === cIdx && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 bg-white shadow-xl border border-slate-200 rounded p-2 z-50 text-left cursor-default" onClick={e=>e.stopPropagation()}>
                            <div className="flex justify-between items-center bg-slate-50 -mx-2 -mt-2 p-2 mb-2 border-b">
                              <span className="font-semibold text-slate-700">Edit Slot</span>
                              <X className="w-4 h-4 cursor-pointer" onClick={() => setEditingCell(null)} />
                            </div>
                            <div className="space-y-2">
                              <input 
                                type="text" 
                                placeholder="Subject Code (e.g. DBMS)" 
                                className="w-full text-xs p-1 border rounded focus:ring-1 focus:ring-indigo-500 outline-none" 
                                value={cellSubject} 
                                onChange={e => {
                                  setCellSubject(e.target.value);
                                  updateCellRealtime(e.target.value, cellRoom, rIdx, cIdx);
                                }} 
                              />
                              <input 
                                type="text" 
                                placeholder="Room (optional)" 
                                className="w-full text-xs p-1 border rounded focus:ring-1 focus:ring-indigo-500 outline-none" 
                                value={cellRoom} 
                                onChange={e => {
                                  setCellRoom(e.target.value);
                                  updateCellRealtime(cellSubject, e.target.value, rIdx, cIdx);
                                }} 
                              />
                              <div className="flex gap-2 pt-1 border-t mt-2 top-2 pt-2">
                                <Button variant="ghost" size="sm" onClick={() => {
                                  setCellSubject('');
                                  setCellRoom('');
                                  updateCellRealtime('', '', rIdx, cIdx);
                                }} className="w-full h-7 text-xs text-red-500 hover:bg-red-50 hover:text-red-600">Clear Cell</Button>
                                <Button size="sm" onClick={() => setEditingCell(null)} className="w-full h-7 text-xs">Done</Button>
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

          <div className="flex justify-between items-center pt-2 border-t">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSaveToDB}>Save to Timetable</Button>
            </div>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div className="space-y-4">
          <div className="py-6 flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
            <h3 className="text-lg font-bold text-slate-800">Import Successful</h3>
          </div>
          
          {unmatchedSubjects.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h4 className="font-bold text-amber-800 flex items-center gap-2 text-sm mb-2">
                <AlertCircle className="w-4 h-4" />
                Unmatched Subjects
              </h4>
              <p className="text-xs text-amber-700 mb-2">
                The following subject codes were imported but not found in your Subject Management database. 
                They have been saved without linking to a master subject:
              </p>
              <div className="flex flex-wrap gap-1">
                {unmatchedSubjects.map(s => <span key={s} className="bg-white border border-amber-300 text-amber-800 text-[10px] px-2 py-0.5 rounded font-bold">{s}</span>)}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button onClick={() => { onClose(); onSaved(); }}>Done</Button>
          </div>
        </div>
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Timetable from PDF" className="max-w-3xl">
      {renderContent()}
    </Modal>
  );
};

const InfoIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

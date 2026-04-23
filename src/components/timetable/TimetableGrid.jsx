import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Info, UserCheck, Coffee, Trash2, User, BookOpen, MapPin } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CellEditor = ({ slotInfo, onClose, onSave, isAuthorized }) => {
  const [subjectId, setSubjectId] = useState(slotInfo.subject_id || '');
  const [teacherId, setTeacherId] = useState(slotInfo.teacher_id || '');
  const [room, setRoom] = useState(slotInfo.room || '');
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const [sData, tData] = await Promise.all([api.getSubjects(), api.getTeachers()]);
      if (Array.isArray(sData)) setSubjects(sData);
      if (Array.isArray(tData)) setTeachers(tData);
    };
    fetchData();
  }, []);

  // Auto-select primary teacher when subject changes
  useEffect(() => {
    if (subjectId && !teacherId) {
       const fetchAssignment = async () => {
          const assignments = await api.getSubjectAssignments();
          const assignment = assignments?.find(a => a.subject_id === subjectId);
          if (assignment) setTeacherId(assignment.teacher_id);
       };
       fetchAssignment();
    }
  }, [subjectId]);

  return (
    <div className="p-5 bg-white space-y-5">
      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Subject</label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none disabled:opacity-50"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={!isAuthorized}
            >
              <option value="">No Lecture</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Teacher (Overwrite)</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                disabled={!isAuthorized}
              >
                <option value="">Default Assignment</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Room No</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Ex: 304"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                disabled={!isAuthorized}
              />
            </div>
          </div>
        </div>
      </div>

      {isAuthorized && (
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <Button 
            variant="ghost" 
            className="text-red-500 hover:bg-red-50 px-3" 
            size="sm"
            onClick={() => onSave({ ...slotInfo, subject_id: null, room: null, teacher_id: null })}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear Slot
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
            <Button onClick={() => onSave({ ...slotInfo, subject_id: subjectId, room, teacher_id: teacherId })} size="sm">Update Schedule</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const TimetableGrid = ({ branch, sem, teacherId = null, editable = false }) => {
  const { role, user } = useAuth();
  const [slots, setSlots] = useState(8);
  const [timetable, setTimetable] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [changeLogs, setChangeLogs] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const config = await api.getSystemConfigKey('lectures_per_day');
      if (config?.value) setSlots(parseInt(config.value, 10));

      if (teacherId) {
        const ttData = await api.getTimetable({ teacher_id: teacherId });
        if (Array.isArray(ttData)) setTimetable(ttData);
      } else if (branch && sem) {
        const ttData = await api.getTimetable({ branch, sem });
        if (Array.isArray(ttData)) setTimetable(ttData);

        const today = new Date().toISOString().split('T')[0];
        const [subData, leaveData, logs] = await Promise.all([
           api.getSubstituteLog({ date: today, status: 'accepted' }),
           api.getLeaveRequests({ date: today, status: 'approved' }),
           api.getTimetableChangeLog(branch, sem)
        ]);
        
        if (Array.isArray(subData)) setSubstitutes(subData);
        if (Array.isArray(leaveData)) setLeaves(leaveData);

        const logsBySlot = {};
        (logs || []).forEach((log) => {
          const key = `${log.day_of_week}-${log.lecture_no}`;
          if (!logsBySlot[key]) logsBySlot[key] = [];
          if (logsBySlot[key].length < 3) logsBySlot[key].push(log);
        });
        setChangeLogs(logsBySlot);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [branch, sem, teacherId]);

  const handleSaveCell = async (updatedSlot) => {
    setLoading(true);
    try {
      const isUpdate = !!timetable.find(
        (t) => t.day_of_week === updatedSlot.day_of_week && t.lecture_no === updatedSlot.lecture_no
      );

      let subject = null;
      let finalTeacherId = updatedSlot.teacher_id || null;

      if (updatedSlot.subject_id) {
        const subs = await api.getSubjects();
        subject = subs?.find((s) => s.id === updatedSlot.subject_id) || null;

        if (!finalTeacherId) {
           const assignments = await api.getSubjectAssignments();
           const assignment = assignments?.find((a) => a.subject_id === updatedSlot.subject_id);
           finalTeacherId = assignment?.teacher_id || null;
        }
      }

      const res = await api.upsertTimetableSlot({
        branch,
        sem,
        day_of_week: updatedSlot.day_of_week,
        lecture_no: updatedSlot.lecture_no,
        subject_id: updatedSlot.subject_id || null,
        room: updatedSlot.room || null,
        teacher_id: finalTeacherId,
      });

      await api.insertTimetableChangeLog({
        timetable_id: res?.id ?? null,
        changed_by: user.id,
        branch,
        sem,
        day_of_week: updatedSlot.day_of_week,
        lecture_no: updatedSlot.lecture_no,
        change_description: isUpdate
          ? `Updated to ${subject?.name || 'Empty'}`
          : `Set to ${subject?.name || 'Empty'}`,
      });

      toast.success('Schedule updated');
      setEditingCell(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update slot: ' + (error.message || 'Database error'));
    } finally {
      setLoading(false);
    }
  };

  const getCellData = (day, lecNo) => {
    return timetable.find(t => t.day_of_week === day && t.lecture_no === lecNo);
  };

  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  if (loading) return (
    <div className="p-20 text-center space-y-4">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
      <p className="text-slate-400 text-sm font-medium animate-pulse">Syncing school schedule...</p>
    </div>
  );

  if (!branch || !sem) return (
    <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
      <div className="bg-white p-3 rounded-full w-fit mx-auto shadow-sm border border-slate-100 mb-4">
        <Filter className="h-6 w-6 text-slate-300" />
      </div>
      <h3 className="text-slate-900 font-bold mb-1">Select Identity</h3>
      <p className="text-slate-400 text-sm max-w-xs mx-auto">Please choose a branch and semester from the filter above to modify the timetable.</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-xl shadow-slate-200/50">
      <table className="w-full text-sm text-left table-fixed border-collapse">
        <thead>
          <tr className="bg-slate-50/50 backdrop-blur-sm border-b border-slate-200">
            <th className="w-28 px-4 py-4 border-r border-slate-200/60 sticky left-0 bg-slate-50/80 backdrop-blur-md z-10">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Structure</span>
            </th>
            {Array.from({ length: slots }).map((_, i) => (
              <th key={i} className="px-4 py-4 text-center border-r border-slate-200/60 w-32">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lecture</span>
                  <span className="text-lg font-black text-slate-800 leading-none mt-0.5">{i + 1}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(day => (
            <tr key={day} className={`group transition-all duration-300 border-b border-slate-100 last:border-0 ${day === currentDay ? 'bg-indigo-50/30' : 'hover:bg-slate-50/50'}`}>
              <td className="px-4 py-4 border-r border-slate-200/60 font-black text-slate-900 sticky left-0 bg-inherit shadow-[2px_0_10px_-5px_rgba(0,0,0,0.1)] z-10 transition-all group-hover:pl-6">
                <span className="text-xs uppercase tracking-tighter">{day}</span>
              </td>
              {Array.from({ length: slots }).map((_, i) => {
                const lecNo = i + 1;
                const cellData = getCellData(day, lecNo);
                const isAuthorizedToEdit = role === 'admin' || role === 'hod';

                const hasSubstitute = substitutes.find(s => s.timetable_id === cellData?.id);
                const teacherOnLeave = leaves.find(l => l.teacher_id === cellData?.teacher_id);
                const logs = changeLogs[`${day}-${lecNo}`] || [];

                return (
                  <td 
                    key={lecNo} 
                    className={`border-r border-slate-100/60 p-1.5 relative transition-all duration-500 ${isAuthorizedToEdit && editable ? 'cursor-pointer hover:scale-[1.02] hover:z-20' : ''}`}
                    onClick={() => {
                      if (editable && isAuthorizedToEdit) {
                        setEditingCell({
                          day_of_week: day,
                          lecture_no: lecNo,
                          subject_id: cellData?.subject_id,
                          room: cellData?.room,
                          teacher_id: cellData?.teacher_id
                        });
                      }
                    }}
                  >
                    <div className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 transition-all duration-500 shadow-sm
                       ${cellData?.subjects 
                          ? 'bg-white border-white group-hover:border-indigo-100 group-hover:shadow-indigo-100/50' 
                          : 'bg-slate-50/30 border-dashed border-slate-200 group-hover:bg-white group-hover:border-indigo-100'}
                    `}>
                      {cellData?.subjects ? (
                        <div className="text-center px-1 animate-in zoom-in-95 duration-500">
                          <span className="inline-block font-black text-slate-800 text-xs mb-0.5">{cellData.subjects.code}</span>
                          <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[7rem] tracking-tight">{cellData.subjects.name}</p>
                          {(teacherId || cellData.branch) && (
                            <div className="mt-1 flex items-center justify-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full">
                               <span className="text-[8px] font-black text-indigo-500 uppercase">{cellData.branch} S{cellData.sem}</span>
                            </div>
                          )}
                          {cellData.room && (
                            <div className="mt-1 flex items-center justify-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full">
                               <MapPin className="h-2 w-2 text-slate-400" />
                               <span className="text-[8px] font-black text-slate-500">{cellData.room}</span>
                            </div>
                          )}
                          <div className="flex gap-1 mt-1.5 justify-center">
                            {hasSubstitute && <Badge variant="indigo" className="px-1 py-0"><UserCheck className="h-3 w-3" /></Badge>}
                            {teacherOnLeave && <Badge variant="warning" className="px-1 py-0 group/leave relative">
                               <Coffee className="h-3 w-3" />
                               <span className="hidden group-hover/leave:block absolute bottom-full mb-1 left-0 bg-slate-900 text-white text-[8px] px-1 rounded whitespace-nowrap">On Leave</span>
                            </Badge>}
                          </div>
                        </div>
                      ) : (
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-300 transition-all duration-700" />
                      )}
                    </div>

                    {/* Change Log Peek */}
                    {logs.length > 0 && (
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                           <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <Modal isOpen={!!editingCell} onClose={() => setEditingCell(null)} title="Update Lecture Schedule">
        {editingCell && (
          <CellEditor 
            slotInfo={editingCell} 
            onClose={() => setEditingCell(null)} 
            onSave={handleSaveCell}
            isAuthorized={role === 'admin' || role === 'hod'} 
          />
        )}
      </Modal>
    </div>
  );
};

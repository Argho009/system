import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { toast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Info, UserCheck, Coffee, Trash2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const CellEditor = ({ slotInfo, onClose, onSave, isAuthorized }) => {
  const [subjectId, setSubjectId] = useState(slotInfo.subject_id || '');
  const [room, setRoom] = useState(slotInfo.room || '');
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      const { data } = await supabase.from('subjects').select('id, code, name');
      if (data) setSubjects(data);
    };
    fetchSubjects();
  }, []);

  return (
    <div className="p-4 bg-white rounded-md space-y-4">
      <div>
        <label className="text-sm font-medium">Subject</label>
        <select 
          className="w-full mt-1 border border-slate-300 rounded px-2 py-1 bg-slate-50 disabled:opacity-70"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          disabled={!isAuthorized || slotInfo.canOnlyEditRoom}
        >
          <option value="">Select Subject...</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium">Room</label>
        <input 
          type="text" 
          className="w-full mt-1 border border-slate-300 rounded px-2 py-1"
          value={room} 
          onChange={(e) => setRoom(e.target.value)}
          disabled={!isAuthorized}
        />
      </div>
      {isAuthorized && (
        <div className="flex justify-between items-center pt-2">
          {slotInfo.subject_id && !slotInfo.canOnlyEditRoom && (
            <Button 
              variant="ghost" 
              className="text-red-500 hover:bg-red-50" 
              size="sm"
              onClick={() => onSave({ ...slotInfo, subject_id: null, room: '' })}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
            <Button onClick={() => onSave({ ...slotInfo, subject_id: subjectId, room })} size="sm">Save</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const TimetableGrid = ({ branch, sem, editable = false }) => {
  const { role, user } = useAuth();
  const [slots, setSlots] = useState(8);
  const [timetable, setTimetable] = useState([]);
  const [substitutes, setSubstitutes] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [changeLogs, setChangeLogs] = useState({});
  const [editingCell, setEditingCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assignedSubjects, setAssignedSubjects] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    // 1. Get config
    const { data: config } = await supabase.from('system_config').select('*').eq('key', 'lectures_per_day').single();
    if (config) setSlots(parseInt(config.value));

    // 2. Get assigned subjects if teacher
    if (role === 'teacher') {
      const { data: assignments } = await supabase.from('subject_assignments').select('subject_id').eq('teacher_id', user.id);
      if (assignments) setAssignedSubjects(assignments.map(a => a.subject_id));
    }

    if (branch && sem) {
      // 2. Get timetable
      const { data: ttData } = await supabase
        .from('timetable')
        .select(`
          *,
          subjects (id, code, name),
          users:teacher_id (name)
        `)
        .eq('branch', branch)
        .eq('sem', sem);
      if (ttData) setTimetable(ttData);

      // 3. Get substitutes for today
      const today = new Date().toISOString().split('T')[0];
      const { data: subData } = await supabase
        .from('substitute_log')
        .select('*')
        .eq('date', today)
        .eq('status', 'accepted');
      if (subData) setSubstitutes(subData);

      // 4. Get leaves
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('date', today)
        .eq('status', 'approved');
      if (leaveData) setLeaves(leaveData);

      // 5. Get change logs for all slots
      const { data: logs } = await supabase
        .from('timetable_change_log')
        .select('*, users(name)')
        .eq('branch', branch)
        .eq('sem', sem)
        .order('changed_at', { ascending: false });
      
      const logsBySlot = {};
      logs?.forEach(log => {
        const key = `${log.day_of_week}-${log.lecture_no}`;
        if (!logsBySlot[key]) logsBySlot[key] = [];
        if (logsBySlot[key].length < 3) logsBySlot[key].push(log);
      });
      setChangeLogs(logsBySlot);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [branch, sem]);

  const handleSaveCell = async (updatedSlot) => {
    setLoading(true);
    try {
      const isUpdate = !!timetable.find(t => t.day_of_week === updatedSlot.day_of_week && t.lecture_no === updatedSlot.lecture_no);
      
      let subject = null;
      let teacher_id = null;

      if (updatedSlot.subject_id) {
        // 1. Get subject details for logging
        const { data: sub } = await supabase.from('subjects').select('name').eq('id', updatedSlot.subject_id).single();
        subject = sub;

        // 2. Automatically get the assigned teacher for this subject for the timetable record
        const { data: assignment } = await supabase
          .from('subject_assignments')
          .select('teacher_id')
          .eq('subject_id', updatedSlot.subject_id)
          .maybeSingle();
        
        teacher_id = assignment?.teacher_id || null;
      }

      const { error } = await supabase.from('timetable').upsert({
        branch,
        sem,
        day_of_week: updatedSlot.day_of_week,
        lecture_no: updatedSlot.lecture_no,
        subject_id: updatedSlot.subject_id || null,
        room: updatedSlot.room,
        teacher_id: teacher_id // Save the teacher association
      }, { onConflict: 'branch,sem,day_of_week,lecture_no' });

      if (error) throw error;

      // Log the change
      await supabase.from('timetable_change_log').insert({
        branch,
        sem,
        day_of_week: updatedSlot.day_of_week,
        lecture_no: updatedSlot.lecture_no,
        changed_by: user.id,
        change_description: isUpdate ? `Updated to ${subject?.name || 'Empty'} in ${updatedSlot.room}` : `Set to ${subject?.name || 'Empty'} in ${updatedSlot.room}`
      });

      toast.success('Slot updated');
      setEditingCell(null);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update slot: ' + (error.message || 'Database error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdateRoom = async () => {
    const defaultRoom = prompt('Enter default room for all lectures in this schedule:');
    if (!defaultRoom) return;

    if (!confirm(`Are you sure you want to set the room to "${defaultRoom}" for all assigned lectures in this branch/sem?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from('timetable')
      .update({ room: defaultRoom })
      .eq('branch', branch)
      .eq('sem', sem);

    if (error) {
      toast.error('Failed to update rooms');
    } else {
      toast.success('All rooms updated for this schedule');
      fetchData();
    }
    setLoading(false);
  };

  const getCellData = (day, lecNo) => {
    return timetable.find(t => t.day_of_week === day && t.lecture_no === lecNo);
  };

  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  if (loading) return <div className="p-8 text-center text-slate-500">Loading timetable...</div>;
  if (!branch || !sem) return <div className="p-4 text-center text-slate-500 border rounded-lg bg-slate-50">Select Branch and Sem to view timetable.</div>;

  return (
    <div className="space-y-4">
      {editable && role === 'admin' && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleBulkUpdateRoom}>
            Set Default Room for Week
          </Button>
        </div>
      )}
      <div className="overflow-x-auto border border-slate-200 rounded-md bg-white">
      <table className="w-full text-sm text-left table-fixed">
        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
          <tr>
            <th className="w-24 px-4 py-3 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 text-xs text-slate-500 font-bold uppercase tracking-wider">DAY</th>
            {Array.from({ length: slots }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-center border-r border-slate-200 w-32 text-xs text-slate-500 font-bold uppercase tracking-wider">Lec {i + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map(day => (
            <tr key={day} className={`border-b border-slate-200 ${day === currentDay ? 'bg-indigo-50/40' : 'bg-white'}`}>
              <td className="px-4 py-4 border-r border-slate-200 font-bold text-slate-700 sticky left-0 bg-inherit shadow-[1px_0_0_0_#e2e8f0] z-10 text-xs">
                {day.toUpperCase()}
              </td>
              {Array.from({ length: slots }).map((_, i) => {
                const lecNo = i + 1;
                const cellData = getCellData(day, lecNo);
                const isManagement = role === 'admin' || role === 'hod';
                const isTeacherOwn = role === 'teacher' && assignedSubjects.includes(cellData?.subject_id);
                const isAuthorizedToEdit = isManagement || isTeacherOwn;

                const hasSubstitute = substitutes.find(s => s.timetable_id === cellData?.id);
                const teacherOnLeave = leaves.find(l => l.teacher_id === cellData?.teacher_id);
                const logs = changeLogs[`${day}-${lecNo}`] || [];

                return (
                  <td 
                    key={lecNo} 
                    className={`border-r border-slate-200 p-2 relative group transition-colors ${isAuthorizedToEdit && editable ? 'cursor-pointer hover:bg-slate-100/50' : ''}`}
                    onClick={() => {
                      if (editable && isAuthorizedToEdit) {
                        setEditingCell({
                          day_of_week: day,
                          lecture_no: lecNo,
                          subject_id: cellData?.subject_id,
                          room: cellData?.room,
                          canOnlyEditRoom: isTeacherOwn && !isManagement
                        });
                      }
                    }}
                  >
                    <div className="flex flex-col items-center justify-center h-20 rounded border border-transparent group-hover:border-slate-200">
                      {cellData?.subjects ? (
                        <>
                          <span className="font-bold text-slate-900">{cellData.subjects.code}</span>
                          <span className="text-[10px] text-slate-500 mt-1 uppercase font-medium">{cellData.room}</span>
                          
                          <div className="flex gap-1 mt-1">
                            {hasSubstitute && <Badge variant="indigo" className="px-1 py-0"><UserCheck className="h-3 w-3" /></Badge>}
                            {teacherOnLeave && <Badge variant="warning" className="px-1 py-0"><Coffee className="h-3 w-3" /></Badge>}
                          </div>
                        </>
                      ) : (
                        <span className="text-slate-200 font-light">—</span>
                      )}
                    </div>

                    {/* Change Log Tooltip */}
                    {logs.length > 0 && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <div className="relative group/tooltip">
                          <Info className="h-3.5 w-3.5 text-slate-300 cursor-help hover:text-indigo-500 transition-colors" />
                          <div className="absolute bottom-full right-0 mb-2 w-52 p-2 bg-slate-900 text-white text-[10px] rounded shadow-2xl hidden group-hover/tooltip:block z-30">
                             <p className="font-bold border-b border-slate-700 pb-1 mb-1 uppercase tracking-tighter text-[9px] text-indigo-300">Recent Changes</p>
                             {logs.map((log, idx) => (
                               <p key={idx} className="mb-1 last:mb-0 leading-tight">
                                 <span className="text-slate-400 font-medium">{new Date(log.changed_at).toLocaleDateString('en-IN')}:</span> {log.change_description} by {log.users?.name}
                               </p>
                             ))}
                          </div>
                        </div>
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

      <Modal isOpen={!!editingCell} onClose={() => setEditingCell(null)} title="Schedule Lecture">
        {editingCell && (
          <CellEditor 
            slotInfo={editingCell} 
            onClose={() => setEditingCell(null)} 
            onSave={handleSaveCell}
            isAuthorized={role === 'admin' || role === 'hod' || (role === 'teacher' && editingCell.canOnlyEditRoom)} 
          />
        )}
      </Modal>
    </div>
  );
};

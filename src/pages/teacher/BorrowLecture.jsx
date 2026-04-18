import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';

export const BorrowLecture = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [timetableSlots, setTimetableSlots] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ timetable_id: '', date: '', note: '' });

  useEffect(() => {
    fetchAll();
    supabase.from('users').select('id, name, college_id').eq('role', 'teacher').neq('id', user.id)
      .then(({ data }) => setTeachers(data || []));
    supabase.from('subject_assignments').select('subject_id, subjects(code, name, sem, branch)').eq('teacher_id', user.id)
      .then(async ({ data }) => {
        setAssignments(data || []);
        if (!data?.length) return;
        const subjectIds = data.map(a => a.subject_id);
        const { data: slots } = await supabase.from('timetable').select('id, day_of_week, lecture_no, branch, sem, subjects(code)').in('subject_id', subjectIds);
        setTimetableSlots(slots || []);
      });
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from('substitute_log')
      .select('*, original:users!substitute_log_original_teacher_id_fkey(name), substitute:users!substitute_log_substitute_teacher_id_fkey(name), timetable(day_of_week, lecture_no, branch, sem, subjects(code))')
      .or(`original_teacher_id.eq.${user.id},substitute_teacher_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('substitute_log').insert([{
      timetable_id: form.timetable_id,
      date: form.date,
      original_teacher_id: user.id,
      substitute_teacher_id: form.substitute_teacher_id,
      note: form.note,
      status: 'pending',
    }]);
    if (error) toast.error(error.message);
    else { toast.success('Borrow request sent'); setIsModalOpen(false); setForm({ timetable_id: '', date: '', note: '' }); fetchAll(); }
  };

  const handleAccept = async (id) => {
    const { error } = await supabase.from('substitute_log').update({ status: 'accepted', accepted_by: user.id }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Accepted'); fetchAll(); }
  };

  const handleReject = async (id) => {
    const { error } = await supabase.from('substitute_log').update({ status: 'rejected' }).eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success('Rejected'); fetchAll(); }
  };

  const statusVariant = { pending: 'warning', accepted: 'success', rejected: 'danger' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Borrow Lecture</h2>
          <p className="text-sm text-slate-500">Request another teacher to cover your lecture slot, or accept incoming requests.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New Borrow Request</Button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="space-y-3">
          {logs.length === 0 && <p className="text-sm text-slate-400">No borrow requests yet.</p>}
          {logs.map(l => {
            const isIncoming = l.substitute_teacher_id === user.id;
            return (
              <div key={l.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[l.status]}>{l.status}</Badge>
                    <Badge variant={isIncoming ? 'indigo' : 'default'}>{isIncoming ? 'Incoming' : 'Outgoing'}</Badge>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {l.timetable?.subjects?.code} — {l.timetable?.day_of_week} Lec {l.timetable?.lecture_no}
                    <span className="text-xs text-slate-500 ml-2">({l.timetable?.branch}, Sem {l.timetable?.sem})</span>
                  </p>
                  <p className="text-sm text-slate-600">Date: {new Date(l.date).toLocaleDateString('en-IN')}</p>
                  <p className="text-sm text-slate-500">
                    {isIncoming ? `From: ${l.original?.name}` : `Substitute: ${l.substitute?.name}`}
                  </p>
                  {l.note && <p className="text-xs text-slate-400">Note: {l.note}</p>}
                </div>
                {isIncoming && l.status === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleAccept(l.id)}>Accept</Button>
                    <Button size="sm" variant="danger" onClick={() => handleReject(l.id)}>Decline</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Borrow Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <div className="flex gap-2">
              <Input type="date" className="flex-1" value={form.date} onChange={e => {
                setForm({ ...form, date: e.target.value, timetable_id: '' });
              }} required />
              <Button type="button" variant="secondary" onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setForm({ ...form, date: today, timetable_id: '' });
              }}>Today</Button>
              <Button type="button" variant="secondary" onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setForm({ ...form, date: tomorrow.toISOString().split('T')[0], timetable_id: '' });
              }}>Tomorrow</Button>
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">My Lecture Slot</label>
            <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.timetable_id} onChange={e => setForm({ ...form, timetable_id: e.target.value })} required disabled={!form.date}>
              <option value="">Select slot...</option>
              {timetableSlots.filter(s => {
                if (!form.date) return true;
                const dayStr = new Date(form.date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
                return s.day_of_week === dayStr;
              }).map(s => <option key={s.id} value={s.id}>{s.subjects?.code} — {s.day_of_week} Lec {s.lecture_no} ({s.branch}, Sem {s.sem})</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Substitute Teacher</label>
            <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.substitute_teacher_id} onChange={e => setForm({ ...form, substitute_teacher_id: e.target.value })} required>
              <option value="">Select teacher...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.college_id})</option>)}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Note (optional)</label>
            <textarea className="h-16 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none" value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Send Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
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
  const [form, setForm] = useState({
    timetable_id: '',
    date: '',
    substitute_teacher_id: '',
    note: '',
  });

  useEffect(() => {
    fetchAll();
    (async () => {
      try {
        const t = await api.getTeachers(user.id);
        setTeachers(Array.isArray(t) ? t : []);
        const data = await api.getSubjectAssignments({ teacher_id: user.id });
        setAssignments(Array.isArray(data) ? data : []);
        const subjectIds = (data || []).map((a) => a.subject_id);
        if (!subjectIds.length) {
          setTimetableSlots([]);
          return;
        }
        const slots = await api.getTimetable({ subject_ids: subjectIds.join(',') });
        setTimetableSlots(Array.isArray(slots) ? slots : []);
      } catch {
        setTimetableSlots([]);
      }
    })();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await api.getSubstituteLog({ mine: '1' });
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createSubstituteLog({
        timetable_id: form.timetable_id,
        date: form.date,
        original_teacher_id: user.id,
        substitute_teacher_id: form.substitute_teacher_id,
        note: form.note,
      });
      toast.success('Borrow request sent');
      setIsModalOpen(false);
      setForm({ timetable_id: '', date: '', substitute_teacher_id: '', note: '' });
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const handleAccept = async (id) => {
    try {
      await api.patchSubstituteLog(id, { status: 'accepted', accepted_by: user.id });
      toast.success('Accepted');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.patchSubstituteLog(id, { status: 'rejected', accepted_by: user.id });
      toast.success('Rejected');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const statusVariant = { pending: 'warning', accepted: 'success', rejected: 'danger' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Borrow Lecture</h2>
          <p className="text-sm text-slate-500">
            Request another teacher to cover your lecture slot, or accept incoming requests.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New Borrow Request</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {logs.length === 0 && <p className="text-sm text-slate-400">No borrow requests yet.</p>}
          {logs.map((l) => {
            const isIncoming = l.substitute_teacher_id === user.id;
            return (
              <div
                key={l.id}
                className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant[l.status]}>{l.status}</Badge>
                    <Badge variant={isIncoming ? 'indigo' : 'default'}>
                      {isIncoming ? 'Incoming' : 'Outgoing'}
                    </Badge>
                  </div>
                  <p className="font-semibold text-slate-800">
                    {l.timetable?.subjects?.code} — {l.timetable?.day_of_week} Lec {l.timetable?.lecture_no}
                    <span className="text-xs text-slate-500 ml-2">
                      ({l.timetable?.branch}, Sem {l.timetable?.sem})
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    Date: {new Date(l.date).toLocaleDateString('en-IN')}
                  </p>
                  <p className="text-sm text-slate-500">
                    {isIncoming ? `From: ${l.original?.name}` : `Substitute: ${l.substitute?.name}`}
                  </p>
                  {l.note && <p className="text-xs text-slate-400">Note: {l.note}</p>}
                </div>
                {isIncoming && l.status === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleAccept(l.id)}>
                      Accept
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleReject(l.id)}>
                      Decline
                    </Button>
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
              <Input
                type="date"
                className="flex-1"
                value={form.date}
                onChange={(e) => {
                  setForm({ ...form, date: e.target.value, timetable_id: '' });
                }}
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setForm({ ...form, date: today, timetable_id: '' });
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setForm({ ...form, date: tomorrow.toISOString().split('T')[0], timetable_id: '' });
                }}
              >
                Tomorrow
              </Button>
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">My Lecture Slot</label>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.timetable_id}
              onChange={(e) => setForm({ ...form, timetable_id: e.target.value })}
              required
              disabled={!form.date}
            >
              <option value="">Select slot...</option>
              {timetableSlots
                .filter((s) => {
                  if (!form.date) return true;
                  const dayStr = new Date(form.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                  });
                  return s.day_of_week === dayStr;
                })
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.subjects?.code} — {s.day_of_week} Lec {s.lecture_no} ({s.branch}, Sem {s.sem})
                  </option>
                ))}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Substitute Teacher</label>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.substitute_teacher_id}
              onChange={(e) => setForm({ ...form, substitute_teacher_id: e.target.value })}
              required
            >
              <option value="">Select teacher...</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.college_id})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Note (optional)</label>
            <textarea
              className="h-16 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Send Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

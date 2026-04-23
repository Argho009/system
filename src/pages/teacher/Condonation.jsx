import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';

export const TeacherCondonation = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ student_roll: '', subject_id: '', lectures_condoned: 1, reason: '', sem: '', academic_year: '' });
  const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        const [asgn, cfg] = await Promise.all([
          api.getSubjectAssignments({ teacher_id: user.id }),
          api.getSystemConfigKey('current_academic_year').catch(() => null),
        ]);
        setAssignments(asgn || []);
        setForm(f => ({ ...f, academic_year: cfg?.value || '2024-25' }));
      } catch {
        toast.error('Failed to load assignments');
      }
    };
    load();
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await api.getAttendanceCondonation({ requested_by: user.id });
      setRequests(data || []);
    } catch {
      setRequests([]);
    }
    setLoading(false);
  };

  const lookupStudent = async () => {
    if (!form.student_roll) return;
    try {
      const list = await api.getStudents({ roll_no: form.student_roll.trim() });
      const data = list?.[0];
      if (!data) { toast.error('Student not found'); return; }
      setStudentId(data.id);
      toast.success(`Found: ${data.users?.name || ''}`);
    } catch {
      toast.error('Student not found');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) return toast.error('Look up student first');
    const sub = assignments.find(a => a.subject_id === form.subject_id);
    try {
      await api.createAttendanceCondonation({
        student_id: studentId,
        subject_id: form.subject_id,
        lectures_condoned: parseInt(form.lectures_condoned, 10),
        reason: form.reason,
        requested_by: user.id,
        teacher_confirmed_by: user.id,
        academic_year: form.academic_year,
        sem: Number(sub?.subjects?.sem ?? form.sem ?? 1),
        status: 'teacher_review',
      });
      toast.success('Condonation submitted to HOD');
      setIsModalOpen(false);
      setStudentId(null);
      setForm(f => ({ ...f, student_roll: '', subject_id: '', lectures_condoned: 1, reason: '' }));
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit');
    }
  };

  const statusVariant = { pending: 'warning', teacher_review: 'blue', approved: 'success', rejected: 'danger' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">BOA Requests</h2>
          <p className="text-sm text-slate-500">Submit BOA (Board of Appeals) for students. HOD gives final approval.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New Request</Button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-sm text-slate-400">No BOA requests.</p>}
          {requests.map(r => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge>
                    <Badge variant="indigo">{r.subjects?.code}</Badge>
                  </div>
                  <p className="font-semibold text-slate-800">{r.students?.users?.name} <span className="text-xs text-slate-400">({r.students?.roll_no})</span></p>
                  <p className="text-sm text-slate-600">Lectures: <strong>{r.lectures_condoned}</strong> • Subject: {r.subjects?.name}</p>
                  <p className="text-sm text-slate-500">{r.reason}</p>
                </div>
                <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setStudentId(null); }} title="New BOA Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input label="Student Roll No." value={form.student_roll} onChange={e => setForm({ ...form, student_roll: e.target.value })} placeholder="e.g. 0101CS21001" />
            <div className="flex items-end"><Button type="button" variant="secondary" onClick={lookupStudent}>Lookup</Button></div>
          </div>
          {studentId && <p className="text-sm text-green-600 font-medium">✓ Student found</p>}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" 
              value={form.subject_id} 
              onChange={e => setForm({ ...form, subject_id: e.target.value })} 
              required
            >
              <option value="">Select...</option>
              {assignments.map(a => (
                <option key={a.id} value={a.subject_id}>
                  {a.subjects?.code} – {a.subjects?.name} ({a.branch_name || a.subjects?.branch})
                </option>
              ))}
            </select>
          </div>
          <Input label="Lectures to Condone" type="number" min="1" max="20" value={form.lectures_condoned} onChange={e => setForm({ ...form, lectures_condoned: e.target.value })} required />
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <textarea className="h-20 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setIsModalOpen(false); setStudentId(null); }}>Cancel</Button>
            <Button type="submit" disabled={!studentId}>Submit to HOD</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

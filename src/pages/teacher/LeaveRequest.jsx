import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';

export const TeacherLeaveRequest = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ date: '', type: 'planned', reason: '', suggested_substitute: '' });

  useEffect(() => {
    fetchLeaves();
    supabase.from('users').select('id, name, college_id').eq('role', 'teacher').neq('id', user.id).then(({ data }) => setTeachers(data || []));
  }, [user]);

  async function fetchLeaves() {
    setLoading(true);
    const { data } = await supabase.from('leave_requests')
      .select('*, reviewer:users!leave_requests_reviewed_by_fkey(name), substitute:users!leave_requests_suggested_substitute_fkey(name)')
      .eq('teacher_id', user.id).order('created_at', { ascending: false });
    setLeaves(data || []);
    setLoading(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, teacher_id: user.id, suggested_substitute: form.suggested_substitute || null };
    const { error } = await supabase.from('leave_requests').insert([payload]);
    if (error) toast.error(error.message);
    else { toast.success('Leave request submitted'); setIsModalOpen(false); setForm({ date: '', type: 'planned', reason: '', suggested_substitute: '' }); fetchLeaves(); }
  };

  const statusVariant = { pending: 'warning', approved: 'success', rejected: 'danger' };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Leave Requests</h2>
          <p className="text-sm text-slate-500">Submit and track your leave requests.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Request Leave</Button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="space-y-3">
          {leaves.length === 0 && <p className="text-sm text-slate-400">No leave requests yet.</p>}
          {leaves.map(l => (
            <div key={l.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={l.type === 'emergency' ? 'danger' : 'blue'}>{l.type}</Badge>
                  <Badge variant={statusVariant[l.status]}>{l.status}</Badge>
                </div>
                <p className="font-semibold text-slate-800">{new Date(l.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                {l.reason && <p className="text-sm text-slate-500">{l.reason}</p>}
                {l.substitute && <p className="text-xs text-slate-400">Suggested: {l.substitute.name}</p>}
                {l.reviewer && <p className="text-xs text-slate-400">Reviewed by: {l.reviewer.name}</p>}
              </div>
              <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleDateString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Request Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              <option value="planned">Planned</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <textarea className="h-20 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Suggested Substitute (optional)</label>
            <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.suggested_substitute} onChange={e => setForm({ ...form, suggested_substitute: e.target.value })}>
              <option value="">— None —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.college_id})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

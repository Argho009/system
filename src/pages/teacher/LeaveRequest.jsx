import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
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
    (async () => {
      try {
        const list = await api.getTeachers(user?.id);
        setTeachers(Array.isArray(list) ? list : []);
      } catch {
        setTeachers([]);
      }
    })();
  }, [user]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await api.getLeaveRequests({ teacher_id: user.id });
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setLeaves(sorted);
    } catch {
      setLeaves([]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createLeaveRequest({
        ...form,
        suggested_substitute: form.suggested_substitute || undefined,
      });
      toast.success('Leave request submitted');
      setIsModalOpen(false);
      setForm({ date: '', type: 'planned', reason: '', suggested_substitute: '' });
      fetchLeaves();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statusVariant = { pending: 'warning', approved: 'success', rejected: 'danger' };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Leave <span className="text-indigo-600">Portal</span></h2>
          <p className="text-sm text-slate-500 font-medium">Request, track, and manage your academic leaves.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-2xl px-6 shadow-lg shadow-indigo-100 h-12 font-black tracking-tight">
          New Request +
        </Button>
      </div>

      {loading ? (
         <div className="h-64 flex items-center justify-center text-slate-300">Syncing requests...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leaves.length === 0 && (
            <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-100 rounded-3xl p-12 text-center text-slate-400">
               No leave history found.
            </div>
          )}
          {leaves.map(l => (
            <div key={l.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col gap-4 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={l.type === 'emergency' ? 'danger' : 'indigo'} className="rounded-full px-3 py-1 font-black uppercase text-[10px] tracking-widest">{l.type}</Badge>
                  <Badge variant={statusVariant[l.status]} className="rounded-full px-3 py-1 font-black uppercase text-[10px] tracking-widest shadow-sm">{l.status}</Badge>
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(l.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              
              <div className="space-y-2">
                <p className="font-black text-slate-900 text-lg leading-none tracking-tight">
                   {new Date(l.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                {l.reason && <p className="text-sm font-medium text-slate-500 leading-relaxed italic">"{l.reason}"</p>}
              </div>

              <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-4 mt-auto">
                 {l.substitute && (
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Users className="w-3 h-3 text-indigo-600" />
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alt: <span className="text-slate-600">{l.substitute.name}</span></p>
                    </div>
                 )}
                 {l.reviewer && (
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center">
                          <ShieldCheck className="w-3 h-3 text-slate-400" />
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">HR: <span className="text-slate-600">{l.reviewer.name}</span></p>
                    </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Leave Request">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block pl-1">Leave Date</label>
              <input
                type="date"
                className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block pl-1">Reason / Context</label>
              <textarea
                className="w-full h-24 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
                placeholder="Briefly explain the reason for leave..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block pl-1">Leave Type</label>
                <select 
                  className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="planned">Planned</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block pl-1">Suggested Alt</label>
                <select 
                  className="w-full h-12 rounded-2xl border border-slate-100 bg-slate-50 px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 outline-none"
                  value={form.suggested_substitute}
                  onChange={(e) => setForm({ ...form, suggested_substitute: e.target.value })}
                >
                  <option value="">— None —</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl">Cancel</Button>
            <Button type="submit" className="rounded-xl px-8 shadow-lg shadow-indigo-100">Submit to HOD</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';
import { Bell, Pin } from 'lucide-react';

const TYPE_COLORS = {
  assignment: 'warning',
  lab: 'blue',
  library: 'purple',
  general: 'default',
};

export const Notices = () => {
  const { user, role } = useAuth();
  const [notices, setNotices] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    title: '', body: '', type: 'general', subject_id: '', branch: '', sem: '', due_date: '',
  });

  const canPost = role === 'admin' || role === 'hod' || role === 'teacher';

  useEffect(() => {
    fetchNotices();
    if (canPost) fetchSubjects();
  }, []);

  async function fetchNotices() {
    setLoading(true);
    const { data, error } = await supabase
      .from('notices')
      .select('*, users(name), subjects(code)')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load notices');
    else setNotices(data || []);
    setLoading(false);
  }

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('id, code, name');
    if (data) setSubjects(data);
  }

  const handlePost = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      posted_by: user.id,
      subject_id: form.subject_id || null,
      sem: form.sem ? parseInt(form.sem) : null,
      due_date: form.due_date || null,
    };
    const { error } = await supabase.from('notices').insert([payload]);
    if (error) toast.error(error.message);
    else {
      toast.success('Notice posted');
      setIsModalOpen(false);
      setForm({ title: '', body: '', type: 'general', subject_id: '', branch: '', sem: '', due_date: '' });
      fetchNotices();
    }
  };

  const togglePin = async (id, pinned) => {
    await supabase.from('notices').update({ is_pinned: !pinned }).eq('id', id);
    fetchNotices();
  };

  const handleDelete = async () => {
    await supabase.from('notices').update({ is_active: false }).eq('id', deleteTarget);
    toast.success('Notice removed');
    setDeleteTarget(null);
    fetchNotices();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Notice Board</h2>
          <p className="text-sm text-slate-500">Announcements for assignments, labs, and general notices.</p>
        </div>
        {canPost && <Button onClick={() => setIsModalOpen(true)}>Post Notice</Button>}
      </div>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : notices.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No notices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notices.map((n) => (
            <div
              key={n.id}
              className={`bg-white border rounded-lg p-4 shadow-sm ${n.is_pinned ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {n.is_pinned && <Pin className="w-4 h-4 text-indigo-500" />}
                  <Badge variant={TYPE_COLORS[n.type]}>{n.type}</Badge>
                  {n.subjects && <Badge variant="default">{n.subjects.code}</Badge>}
                  {n.due_date && (
                    <span className="text-xs font-semibold text-red-600">
                      Due: {new Date(n.due_date).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
                {canPost && (
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => togglePin(n.id, n.is_pinned)}>
                      {n.is_pinned ? 'Unpin' : 'Pin'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(n.id)}>
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <h3 className="mt-2 font-semibold text-slate-800">{n.title}</h3>
              {n.body && <p className="mt-1 text-sm text-slate-600">{n.body}</p>}
              <div className="mt-2 text-xs text-slate-400">
                Posted by {n.users?.name || 'System'} •{' '}
                {new Date(n.created_at).toLocaleDateString('en-IN')}
                {n.branch && ` • Branch: ${n.branch}`}
                {n.sem && ` • Sem: ${n.sem}`}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Post New Notice">
        <form onSubmit={handlePost} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Body</label>
            <textarea
              className="h-24 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-slate-700">Type</label>
              <select
                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="general">General</option>
                <option value="assignment">Assignment</option>
                <option value="lab">Lab</option>
                <option value="library">Library</option>
              </select>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-medium text-slate-700">Subject (optional)</label>
              <select
                className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              >
                <option value="">— None —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} – {s.name}</option>
                ))}
              </select>
            </div>
            <Input label="Branch (optional)" placeholder="e.g. CS" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} />
            <Input label="Semester (optional)" type="number" min="1" max="8" value={form.sem} onChange={(e) => setForm({ ...form, sem: e.target.value })} />
          </div>
          <Input label="Due Date (optional)" type="datetime-local" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Post</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remove Notice"
        message="Are you sure you want to remove this notice? It will no longer be visible."
      />
    </div>
  );
};

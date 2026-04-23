import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';

export const StudentCondonation = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [requests, setRequests] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ subject_id: '', lectures_condoned: 1, reason: '' });
  const [docFile, setDocFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const stu = await api.getStudentForUser(user.id);
      if (!stu) { setLoading(false); return; }
      const [reqRes, subList, configRes] = await Promise.all([
        api.getAttendanceCondonation({ student_id: stu.id }),
        api.getSubjects(),
        api.getSystemConfigKey('current_academic_year').catch(() => null),
      ]);
      const filteredSubs = (subList || []).filter(
        s => s.branch === stu.branch && Number(s.sem) === Number(stu.sem)
      );
      setRequests(reqRes || []);
      setSubjects(filteredSubs);
      setStudent({ ...stu, academic_year: configRes?.value || '2024-25' });
    } catch {
      toast.error('Failed to load');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    let document_url = null;

    if (docFile) {
      try {
        const fd = new FormData();
        fd.append('file', docFile);
        fd.append('folder', `condonation/${student.id}`);
        const { url } = await api.uploadFile(fd);
        document_url = url;
      } catch {
        toast.error('Document upload failed');
        setSubmitting(false);
        return;
      }
    }

    try {
      await api.createAttendanceCondonation({
        student_id: student.id,
        subject_id: form.subject_id,
        lectures_condoned: parseInt(form.lectures_condoned, 10),
        reason: form.reason,
        document_url,
        requested_by: user.id,
        academic_year: student.academic_year,
        sem: student.sem,
        status: 'pending',
      });
      toast.success('Condonation request submitted');
      setIsModalOpen(false);
      setForm({ subject_id: '', lectures_condoned: 1, reason: '' });
      setDocFile(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
    setSubmitting(false);
  };

  const statusVariant = { pending: 'warning', teacher_review: 'blue', approved: 'success', rejected: 'danger' };

  if (loading) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">BOA Request</h2>
          <p className="text-sm text-slate-500">Request BOA (Board of Appeals) for valid reasons (medical, etc.).</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New Request</Button>
      </div>

      <div className="space-y-3">
        {requests.length === 0 && <p className="text-sm text-slate-400">No BOA requests yet.</p>}
        {requests.map(r => (
          <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex gap-2 items-center">
                  <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge>
                  <Badge variant="indigo">{r.subjects?.code}</Badge>
                </div>
                <p className="font-semibold text-slate-800">{r.subjects?.name}</p>
                <p className="text-sm text-slate-600">Lectures: <strong>{r.lectures_condoned}</strong></p>
                <p className="text-sm text-slate-500">{r.reason}</p>
                {r.document_url && (
                  <a href={r.document_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">View Document</a>
                )}
              </div>
              <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New BOA Request">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <select className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600" value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })} required>
              <option value="">Select...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.code} – {s.name}</option>)}
            </select>
          </div>
          <Input label="Lectures to Condone" type="number" min="1" max="50" value={form.lectures_condoned} onChange={e => setForm({ ...form, lectures_condoned: e.target.value })} required />

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <textarea className="h-24 rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} required />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Supporting Document (optional)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" onChange={e => setDocFile(e.target.files[0])} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Request'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

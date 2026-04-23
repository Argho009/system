import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';

export const HodSubjectAssignment = () => {
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ subject_id: '', teacher_id: '', academic_year: '2024-25' });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, sRes, tRes] = await Promise.all([
        api.getSubjectAssignments(),
        api.getSubjects(),
        api.getTeachers('00000000-0000-0000-0000-000000000001'),
      ]);
      setAssignments(Array.isArray(aRes) ? aRes : []);
      setSubjects(Array.isArray(sRes) ? sRes : []);
      setTeachers(Array.isArray(tRes) ? tRes : []);
    } catch {
      toast.error('Failed to load');
    }
    setLoading(false);
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await api.upsertSubjectAssignment(form);
      toast.success('Assignment saved');
      setIsModalOpen(false);
      setForm({ subject_id: '', teacher_id: '', academic_year: '2024-25' });
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Save failed');
    }
  };

  const handleRemove = async (id) => {
    try {
      await api.deleteSubjectAssignment(id);
      toast.success('Assignment removed');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Remove failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Subject Assignments</h2>
          <p className="text-sm text-slate-500">
            Assign teachers to subjects for the current academic year.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Assign Teacher</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm text-left text-slate-700">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Branch / Sem</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Academic Year</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No assignments yet.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-slate-50 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-indigo-700">{a.subjects?.code}</span>
                      <span className="ml-2 text-slate-600">{a.subjects?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{a.subjects?.branch}</Badge>
                      <span className="ml-2 text-slate-500">Sem {a.subjects?.sem}</span>
                    </td>
                    <td className="px-4 py-3">
                      {a.teacher?.name}
                      <span className="ml-1 text-xs text-slate-400">({a.teacher?.college_id})</span>
                    </td>
                    <td className="px-4 py-3">{a.academic_year}</td>
                    <td className="px-4 py-3">
                      <Button variant="danger" size="sm" onClick={() => handleRemove(a.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign Teacher to Subject">
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Subject</label>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.subject_id}
              onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              required
            >
              <option value="">Select subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} – {s.name} ({s.branch}, Sem {s.sem})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-slate-700">Teacher</label>
            <select
              className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.teacher_id}
              onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
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
            <label className="text-sm font-medium text-slate-700">Academic Year</label>
            <input
              className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              placeholder="e.g. 2024-25"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Assignment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

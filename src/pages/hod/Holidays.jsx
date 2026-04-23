import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';
import { Calendar, Trash2 } from 'lucide-react';

export const HodHolidays = () => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ date: '', reason: '' });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const data = await api.getHolidays();
      const sorted = [...(data || [])].sort((a, b) => a.date.localeCompare(b.date));
      setHolidays(sorted);
    } catch {
      toast.error('Failed to load holidays');
    }
    setLoading(false);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.createHoliday({ ...form, added_by: user.id });
      toast.success('Holiday added');
      setIsModalOpen(false);
      setForm({ date: '', reason: '' });
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteHoliday(deleteId);
      toast.success('Holiday removed');
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
    setDeleteId(null);
  };

  const upcoming = holidays.filter((h) => new Date(h.date) >= new Date(new Date().toDateString()));
  const past = holidays.filter((h) => new Date(h.date) < new Date(new Date().toDateString()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Holiday Management</h2>
          <p className="text-sm text-slate-500">
            Manage public and institute holidays. These affect lecture counting.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Add Holiday</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Upcoming ({upcoming.length})
            </h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-400">No upcoming holidays.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-indigo-500" />
                      <div>
                        <p className="font-medium text-slate-800">{h.reason}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(h.date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(h.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Past ({past.length})
            </h3>
            <div className="space-y-2">
              {past
                .slice(-5)
                .reverse()
                .map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="font-medium text-slate-700">{h.reason}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(h.date).toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Holiday">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <Input
            label="Reason"
            placeholder="e.g. Republic Day"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Remove Holiday"
        message="Remove this holiday? This may affect attendance counts if lectures were already skipped."
      />
    </div>
  );
};

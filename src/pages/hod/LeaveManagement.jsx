import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';

export const HodLeaveManagement = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const data = await api.getLeaveRequests();
      const sorted = [...(data || [])].sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      setLeaves(sorted);
    } catch {
      toast.error('Failed to load');
    }
    setLoading(false);
  };

  const handleAction = async () => {
    const { id, action } = actionTarget;
    try {
      await api.patchLeaveRequest(id, { status: action });
      toast.success(`Leave ${action}`);
      fetchLeaves();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
    setActionTarget(null);
  };

  const statusVariant = { pending: 'warning', approved: 'success', rejected: 'danger' };
  const typeVariant = { planned: 'blue', emergency: 'danger' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Leave Management</h2>
        <p className="text-sm text-slate-500">Review and approve teacher leave requests.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {leaves.length === 0 && <p className="text-sm text-slate-400">No leave requests.</p>}
          {leaves.map((l) => (
            <div
              key={l.id}
              className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={typeVariant[l.type]}>{l.type}</Badge>
                  <Badge variant={statusVariant[l.status]}>{l.status}</Badge>
                  {l.type === 'emergency' && l.status === 'pending' && (
                    <span className="text-xs font-bold text-red-600 animate-pulse">URGENT</span>
                  )}
                </div>
                <p className="font-semibold text-slate-800">
                  {l.teacher?.name}{' '}
                  <span className="text-xs font-normal text-slate-500">
                    ({l.teacher?.college_id})
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  Date: <strong>{new Date(l.date).toLocaleDateString('en-IN')}</strong>
                </p>
                {l.reason && <p className="text-sm text-slate-500">Reason: {l.reason}</p>}
                {l.substitute && (
                  <p className="text-sm text-slate-500">
                    Suggested substitute: <strong>{l.substitute.name}</strong>
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  Submitted: {new Date(l.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              {l.status === 'pending' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" onClick={() => setActionTarget({ id: l.id, action: 'approved' })}>
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setActionTarget({ id: l.id, action: 'rejected' })}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={handleAction}
        title={`${actionTarget?.action === 'approved' ? 'Approve' : 'Reject'} Leave`}
        message={`Are you sure you want to ${actionTarget?.action} this leave request?`}
        confirmText={actionTarget?.action === 'approved' ? 'Approve' : 'Reject'}
        confirmVariant={actionTarget?.action === 'approved' ? 'primary' : 'danger'}
      />
    </div>
  );
};

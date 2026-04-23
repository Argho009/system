import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';

export const HodChangeRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getAttendanceChangeRequests();
      setRequests(data || []);
    } catch {
      toast.error('Failed to load');
    }
    setLoading(false);
  };

  const handleAction = async () => {
    const { id, action } = actionTarget;
    try {
      await api.patchAttendanceChangeRequest(id, {
        status: action,
        apply_attendance: action === 'approved',
      });
      toast.success(`Request ${action}`);
      fetchRequests();
    } catch (e) {
      toast.error(e.message || 'Failed');
    }
    setActionTarget(null);
  };

  const statusVariant = { pending: 'warning', approved: 'success', rejected: 'danger' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Attendance Change Requests</h2>
        <p className="text-sm text-slate-500">Review requests to change attendance records.</p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-sm text-slate-400">No change requests.</p>}
          {requests.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                  <Badge variant={r.requested_status === 'present' ? 'success' : 'danger'}>Change to: {r.requested_status}</Badge>
                </div>
                <p className="font-semibold text-slate-800">
                  {r.students?.users?.name} <span className="text-xs font-normal text-slate-500">({r.students?.roll_no})</span>
                </p>
                <p className="text-sm text-slate-600">
                  Subject: <strong>{r.lectures?.subjects?.code}</strong> • Lec #{r.lectures?.lecture_no} on{' '}
                  {r.lectures?.date ? new Date(r.lectures.date).toLocaleDateString('en-IN') : '—'}
                </p>
                {r.reason && <p className="text-sm text-slate-500">Reason: {r.reason}</p>}
                <p className="text-xs text-slate-400">
                  Requested by: {r.requester?.name} • {new Date(r.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              {r.status === 'pending' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" onClick={() => setActionTarget({ id: r.id, action: 'approved' })}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setActionTarget({ id: r.id, action: 'rejected' })}>
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
        title={`${actionTarget?.action === 'approved' ? 'Approve' : 'Reject'} Change Request`}
        message={`${
          actionTarget?.action === 'approved' ? 'Approving will update the attendance record.' : 'Reject this change request?'
        }`}
        confirmText={actionTarget?.action === 'approved' ? 'Approve & Update' : 'Reject'}
        confirmVariant={actionTarget?.action === 'approved' ? 'primary' : 'danger'}
      />
    </div>
  );
};

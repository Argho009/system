import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';

export const HodCondonation = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getAttendanceCondonation();
      setRequests(data || []);
    } catch {
      toast.error('Failed to load');
    }
    setLoading(false);
  };

  const handleAction = async () => {
    const { id, action } = actionTarget;
    try {
      await api.patchAttendanceCondonation(id, { status: action, approved_by: user.id });
      toast.success(`Condonation ${action}`);
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
    setActionTarget(null);
  };

  const statusVariant = { pending: 'warning', teacher_review: 'blue', approved: 'success', rejected: 'danger' };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Condonation Approval</h2>
        <p className="text-sm text-slate-500">Final approval for attendance condonation requests.</p>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-sm text-slate-400">No condonation requests.</p>}
          {requests.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge>
                  <Badge variant="default">{r.subjects?.code}</Badge>
                </div>
                <p className="font-semibold text-slate-800">
                  {r.students?.users?.name}{' '}
                  <span className="text-xs font-normal text-slate-500">({r.students?.roll_no})</span>
                </p>
                <p className="text-sm text-slate-600">Lectures to condone: <strong>{r.lectures_condoned}</strong></p>
                <p className="text-sm text-slate-600">Subject: <strong>{r.subjects?.name}</strong></p>
                <p className="text-sm text-slate-500">Reason: {r.reason}</p>
                {r.document_url && (
                  <a href={r.document_url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">
                    View Document
                  </a>
                )}
                <p className="text-xs text-slate-400">
                  Requested by: {r.requested_by_user?.name} • {new Date(r.created_at).toLocaleDateString('en-IN')}
                </p>
              </div>
              {(r.status === 'pending' || r.status === 'teacher_review') && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" onClick={() => setActionTarget({ id: r.id, action: 'approved' })}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => setActionTarget({ id: r.id, action: 'rejected' })}>Reject</Button>
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
        title={`${actionTarget?.action === 'approved' ? 'Approve' : 'Reject'} Condonation`}
        message={`Confirm ${actionTarget?.action} of this condonation request?`}
        confirmText={actionTarget?.action === 'approved' ? 'Approve' : 'Reject'}
        confirmVariant={actionTarget?.action === 'approved' ? 'primary' : 'danger'}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';

export const HodLeaveManagement = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null); // { id, action }

  useEffect(() => { fetchLeaves(); }, []);

  async function fetchLeaves() {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, teacher:users!leave_requests_teacher_id_fkey(name, college_id), substitute:users!leave_requests_suggested_substitute_fkey(name)')
      .order('created_at', { ascending: false });
    if (error) toast.error('Failed to load');
    else setLeaves(data || []);
    setLoading(false);
  }

  const handleAction = async () => {
    const { id, action } = actionTarget;
    const { error } = await supabase
      .from('leave_requests')
      .update({ status: action, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(`Leave ${action}`); fetchLeaves(); }
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

      {loading ? <p className="text-sm text-slate-500">Loading...</p> : (
        <div className="space-y-3">
          {leaves.length === 0 && <p className="text-sm text-slate-400">No leave requests.</p>}
          {leaves.map((l) => (
            <div key={l.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={typeVariant[l.type]}>{l.type}</Badge>
                  <Badge variant={statusVariant[l.status]}>{l.status}</Badge>
                  {l.type === 'emergency' && l.status === 'pending' && (
                    <span className="text-xs font-bold text-red-600 animate-pulse">URGENT</span>
                  )}
                </div>
                <p className="font-semibold text-slate-800">
                  {l.teacher?.name} <span className="text-xs font-normal text-slate-500">({l.teacher?.college_id})</span>
                </p>
                <p className="text-sm text-slate-600">Date: <strong>{new Date(l.date).toLocaleDateString('en-IN')}</strong></p>
                {l.reason && <p className="text-sm text-slate-500">Reason: {l.reason}</p>}
                {l.substitute && <p className="text-sm text-slate-500">Suggested substitute: <strong>{l.substitute.name}</strong></p>}
                <p className="text-xs text-slate-400">Submitted: {new Date(l.created_at).toLocaleDateString('en-IN')}</p>
              </div>
              {l.status === 'pending' && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Button size="sm" onClick={() => setActionTarget({ id: l.id, action: 'approved' })}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => setActionTarget({ id: l.id, action: 'rejected' })}>Reject</Button>
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

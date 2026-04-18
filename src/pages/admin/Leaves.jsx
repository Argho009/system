import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { 
  CheckCircle2, XCircle, Clock, Calendar, 
  User, FileText, ChevronRight, Inbox 
} from 'lucide-react';

export const AdminLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [confirmAction, setConfirmAction] = useState(null); // { id, status, name }

  const fetchLeaves = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, users!teacher_id(name, role, college_id)')
      .order('created_at', { ascending: false });
    
    if (error) toast.error('Failed to load leaves');
    else setLeaves(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleUpdateStatus = async () => {
    if (!confirmAction) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: confirmAction.status, approved_at: new Date().toISOString() })
        .eq('id', confirmAction.id);

      if (error) throw error;
      
      toast.success(`Leave request ${confirmAction.status} successfully`);
      setConfirmAction(null);
      fetchLeaves();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeaves = leaves.filter(l => {
    if (activeTab === 'pending') return l.status === 'pending';
    if (activeTab === 'approved') return l.status === 'approved';
    return l.status !== 'pending' && l.status !== 'approved'; // Rejections/Cancelled
  });

  const columns = [
    { 
      header: 'Faculty', 
      accessor: 'teacher_id',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900">{row.users?.name}</span>
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-tighter">{row.users?.college_id}</span>
        </div>
      )
    },
    { 
      header: 'Date', 
      accessor: 'date',
      render: (row) => (
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          {new Date(row.date).toLocaleDateString()}
        </div>
      )
    },
    { 
      header: 'Slots', 
      accessor: 'lecture_nos',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.lecture_nos.split(',').map(s => (
            <Badge key={s} variant="outline" className="text-[9px] px-1.5 py-0 border-slate-200">L{s}</Badge>
          ))}
        </div>
      )
    },
    { 
      header: 'Reason', 
      accessor: 'reason',
      render: (row) => (
        <div className="max-w-[150px] truncate text-xs text-slate-500 italic" title={row.reason}>" {row.reason} "</div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => row.status === 'pending' && (
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-green-600 hover:bg-green-50"
            onClick={() => setConfirmAction({ id: row.id, status: 'approved', name: row.users?.name })}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:bg-red-50"
            onClick={() => setConfirmAction({ id: row.id, status: 'rejected', name: row.users?.name })}
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Leave Approvals</h2>
          <p className="text-sm text-slate-500 font-medium">Manage and review faculty absence requests.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
           {['pending', 'approved', 'history'].map(tab => (
             <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 text-[11px] font-extrabold uppercase tracking-widest rounded-lg transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="panel overflow-hidden">
            <Table 
              columns={columns} 
              data={filteredLeaves} 
              loading={loading}
              emptyMessage={`No ${activeTab} leave requests found.`}
            />
          </div>
        </div>

        <div className="space-y-6">
           <div className="panel p-6 bg-indigo-50 border-indigo-100">
             <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 mb-4 shadow-sm border border-indigo-100">
                <Inbox className="h-5 w-5" />
             </div>
             <h3 className="font-bold text-indigo-900 mb-1">Queue Status</h3>
             <p className="text-xs text-indigo-700 font-medium mb-4">You have {leaves.filter(l => l.status === 'pending').length} requests awaiting your review.</p>
             <div className="space-y-2">
               <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter text-indigo-400">
                 <span>Resolution Rate</span>
                 <span>{Math.round((leaves.filter(l => l.status !== 'pending').length / (leaves.length || 1)) * 100)}%</span>
               </div>
               <div className="h-1.5 w-full bg-indigo-200 rounded-full overflow-hidden">
                 <div 
                  className="h-full bg-indigo-600 transition-all duration-1000" 
                  style={{ width: `${(leaves.filter(l => l.status !== 'pending').length / (leaves.length || 1)) * 100}%` }}
                />
               </div>
             </div>
           </div>

           <div className="panel p-6">
             <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Policy Reminder</h3>
             <ul className="space-y-3">
               {[
                 'Approvals trigger automated substitute alerts.',
                 'Rejected requests notify the faculty immediately.',
                 'Leaves are visible on the public timetable grid.'
               ].map((text, i) => (
                 <li key={i} className="flex gap-3 text-[11px] text-slate-500 font-medium leading-relaxed">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                   {text}
                 </li>
               ))}
             </ul>
           </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleUpdateStatus}
        title={`${confirmAction?.status === 'approved' ? 'Approve' : 'Reject'} Leave Request`}
        message={`Are you sure you want to ${confirmAction?.status} the leave request from ${confirmAction?.name}? This action cannot be undone.`}
      />
    </div>
  );
};

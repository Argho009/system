import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { 
  History, RotateCcw, Trash2, Search, 
  AlertTriangle, ShieldAlert, UserCheck, 
  ChevronRight, HardDrive, Filter 
} from 'lucide-react';

export const EmergencyRecovery = () => {
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDeletedUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      toast.error('Failed to fetch deleted records');
    } else {
      setDeletedUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

  const handleRestore = async (user) => {
    if (!confirm(`Restore ${user.name} to active users?`)) return;

    const { error } = await supabase
      .from('users')
      .update({ 
        deleted_at: null, 
        is_active: true 
      })
      .eq('id', user.id);

    if (error) {
      toast.error('Restoration failed: ' + error.message);
    } else {
      toast.success('User restored successfully');
      fetchDeletedUsers();
    }
  };

  const handlePermanentDelete = async (user) => {
    if (!confirm(`WARNING: This will PERMANENTLY delete ${user.name}. This is IRREVERSIBLE. Proceed?`)) return;

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', user.id);

    if (error) {
      toast.error('Permanent deletion failed: ' + error.message);
    } else {
      toast.success('User permanently erased');
      fetchDeletedUsers();
    }
  };

  const filtered = deletedUsers.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.college_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-100/10 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
           <ShieldAlert className="h-40 w-40" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-red-500/20 backdrop-blur-xl border border-red-500/20 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-red-400 mb-1">
                 <History className="h-3 w-3" />
                 <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Security Archive</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Recovery Center</h2>
              <p className="text-slate-400 text-sm font-medium">Audit-level recovery and permanent data erasure protocol.</p>
            </div>
          </div>
          <div className="flex bg-white/5 backdrop-blur-md rounded-2xl p-2 items-center border border-white/10 gap-4">
             <div className="px-6 py-2 text-center border-r border-white/10">
                <span className="block text-2xl font-black text-red-500">{deletedUsers.length}</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Restorable</span>
             </div>
             <div className="px-6 py-2 text-center">
                <HardDrive className="h-6 w-6 text-slate-500 mx-auto" />
                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400 mt-1 block">Cold Bank</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-4">
          <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100/50 bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-4">
               <div className="relative flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                 <input 
                   type="text"
                   placeholder="Search archived credentials..."
                   className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-sm font-medium"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
               <div className="flex items-center gap-4 px-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type: Soft-Deleted</span>
                  </div>
               </div>
            </div>

            <Table 
              columns={[
                { 
                  header: 'Registry Entry', 
                  accessor: 'name',
                  render: (row) => (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                        {row.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 tracking-tight">{row.name}</span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">{row.college_id}</span>
                      </div>
                    </div>
                  )
                },
                { 
                  header: 'Academic Role', 
                  accessor: 'role',
                  render: (row) => <Badge variant="slate" className="uppercase text-[9px] font-extrabold tracking-widest px-2">{row.role}</Badge>
                },
                { 
                  header: 'Deletion Timestamp', 
                  accessor: 'deleted_at',
                  render: (row) => (
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-600">
                        {new Date(row.deleted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                        {new Date(row.deleted_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )
                },
                {
                  header: 'Security Operations',
                  accessor: 'id',
                  render: (row) => (
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-lg px-3"
                        onClick={() => handleRestore(row)}
                      >
                        <RotateCcw className="h-3 w-3 mr-2" />
                        Restore
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg"
                        onClick={() => handlePermanentDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                }
              ]}
              data={filtered}
              loading={loading}
              emptyMessage="No deleted records found in the archive."
            />
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
           <div className="panel p-6 bg-red-50 border-red-100">
              <div className="w-10 h-10 rounded-xl bg-white border border-red-100 flex items-center justify-center text-red-500 mb-4 shadow-sm">
                 <AlertTriangle className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-red-900 mb-1">Permanent Erasure</h4>
              <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                Erasing a record permanently removes it from the primary registry and all audit trails. This action is terminal and cannot be reversed by any recovery protocol.
              </p>
           </div>

           <div className="panel p-6 border-slate-200">
              <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Retention State</h4>
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Auto-Purge</span>
                    <Badge variant="slate" className="text-[8px] px-1.5 py-0">DISABLED</Badge>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Policy</span>
                    <span className="text-xs font-bold text-slate-800 underline decoration-slate-200 cursor-pointer">Infinite</span>
                 </div>
                 <div className="h-1 w-full bg-slate-100 rounded-full mt-2" />
                 <p className="text-[10px] text-slate-400 font-medium italic">All soft-deleted records are kept until manual erasure is triggered.</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { 
  History, RotateCcw, Trash2, Search, 
  AlertTriangle, ShieldAlert, UserCheck
} from 'lucide-react';

export const EmergencyRecovery = () => {
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDeletedUsers();
  }, []);

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
    if (!confirm(`WARNING: This will PERMANENTLY delete ${user.name} from the database. This action CANNOT be undone. Proceed?`)) return;

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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-red-600 rounded-lg p-6 text-white shadow-lg overflow-hidden relative">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center">
              <ShieldAlert className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Emergency Recovery Center</h2>
              <p className="text-red-100 text-sm opacity-90">Restore recently deleted accounts or perform permanent erasure.</p>
            </div>
          </div>
          <div className="flex bg-white/10 backdrop-blur-md rounded-md p-1 items-center border border-white/20">
             <div className="px-4 py-2 text-center border-r border-white/20">
                <span className="block text-xl font-bold">{deletedUsers.length}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70">Archived</span>
             </div>
             <div className="px-4 py-2 text-center">
                <History className="h-5 w-5 mx-auto opacity-70" />
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-70 mt-1 block">Log</span>
             </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-red-600/20"
            placeholder="Search archived users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-sm">
        <Table 
          columns={[
            { header: 'College ID', accessor: 'college_id' },
            { header: 'Name', accessor: 'name' },
            { 
              header: 'Role', 
              accessor: 'role',
              render: (row) => <Badge variant="slate" className="uppercase">{row.role}</Badge>
            },
            { 
              header: 'Deleted On', 
              accessor: 'deleted_at',
              render: (row) => (
                <span className="text-xs text-slate-500 font-medium">
                  {new Date(row.deleted_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              )
            },
            {
              header: 'Actions',
              accessor: 'id',
              render: (row) => (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-green-600 hover:bg-green-50 border-green-200"
                    onClick={() => handleRestore(row)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => handlePermanentDelete(row)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Erase
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

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 italic">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Note on Recovery:</strong> Restoring a user will immediately reactivate their login and return them to the active user lists. Permanent erasure is irreversible and will lose all associated metadata for that user ID.
        </p>
      </div>
    </div>
  );
};

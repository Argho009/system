import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';
import { SystemSettingsForm } from '../../components/ui/SystemSettingsForm';
import { Settings, Plus, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

export const AdminPreferences = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newBranch, setNewBranch] = useState('');
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [branchToDelete, setBranchToDelete] = useState(null);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    const { data } = await supabase.from('branches').select('*').order('name');
    if (data) setBranches(data);
    setLoading(false);
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.trim()) return;
    const { error } = await supabase.from('branches').insert({ name: newBranch.trim().toUpperCase() });
    if (error) toast.error('Branch already exists');
    else {
      toast.success('Branch added');
      setNewBranch('');
      setBranchModalOpen(false);
      fetchBranches();
    }
  };

  const handleDeleteBranch = async () => {
    const { error } = await supabase.from('branches').delete().eq('id', branchToDelete.id);
    if (error) toast.error('Cannot delete branch with active records');
    else {
      toast.success('Branch deleted');
      fetchBranches();
    }
    setBranchToDelete(null);
  };

  const handleResetDefaults = async () => {
    if (confirmText !== 'RESET') return toast.error('Type RESET to confirm');
    const { error } = await supabase.from('system_config').upsert([
      { key: 'lectures_per_day', value: '8' },
      { key: 'working_days_per_week', value: '6' }
    ]);
    if (error) toast.error('Reset failed');
    else {
      toast.success('System reset to defaults');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-600" />
          System Preferences
        </h2>
        <p className="text-sm text-slate-500">Configure global settings and manage organizational structure.</p>
      </div>

      <SystemSettingsForm />

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800">Branch Management</h3>
          <Button size="sm" onClick={() => setBranchModalOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Branch
          </Button>
        </div>
        <div className="p-6">
          <Table 
            columns={[
              { header: 'Branch Name', accessor: 'name' },
              { header: 'Created At', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
              { header: 'Actions', accessor: 'id', render: (row) => (
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setBranchToDelete(row)}><Trash2 className="h-4 w-4" /></Button>
              )}
            ]} 
            data={branches} 
          />
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg border-2 border-red-50 space-y-4">
        <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase"><AlertTriangle className="h-4 w-4" /> Danger Zone</div>
        <div className="flex justify-between items-center">
          <div><p className="font-semibold text-slate-800">Reset System Config</p><p className="text-xs text-slate-500">Factory reset lecture counts and working days.</p></div>
          <Button variant="danger" onClick={() => setResetModalOpen(true)}>Reset Defaults</Button>
        </div>
      </div>

      <Modal isOpen={branchModalOpen} onClose={() => setBranchModalOpen(false)} title="Add Branch">
        <form onSubmit={handleAddBranch} className="space-y-4">
          <Input label="Branch Name" value={newBranch} onChange={e => setNewBranch(e.target.value)} required />
          <Button type="submit" className="w-full">Create Branch</Button>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!branchToDelete} onClose={() => setBranchToDelete(null)} onConfirm={handleDeleteBranch} title="Delete Branch" message="This action is permanent." />
      
      <Modal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} title="Reset System">
        <div className="space-y-4">
          <p className="text-sm">Type <span className="font-bold underline">RESET</span> to confirm:</p>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="RESET" />
          <Button variant="danger" className="w-full" onClick={handleResetDefaults}>Execute Reset</Button>
        </div>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { Landmark, Plus, Trash2, Search, Users, BookOpen } from 'lucide-react';

export const AdminBranches = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const branchData = await api.getBranches();
      setBranches(branchData || []);

      const [studentData, subjectData] = await Promise.all([api.getStudents(), api.getSubjects()]);
      const sStats = {};
      studentData?.forEach((s) => {
        sStats[s.branch] = (sStats[s.branch] || 0) + 1;
      });
      const subStats = {};
      subjectData?.forEach((s) => {
        subStats[s.branch] = (subStats[s.branch] || 0) + 1;
      });
      setStats({ students: sStats, subjects: subStats });
    } catch (e) {
      toast.error('Failed to fetch branches');
    }
    setLoading(false);
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    try {
      await api.createBranch({ name: newBranchName.trim().toUpperCase(), created_by: user.id });
      toast.success('Branch added successfully');
      setNewBranchName('');
      fetchBranches();
    } catch (e) {
      const msg = e.message || '';
      toast.error(msg.includes('UNIQUE') || msg.includes('unique') ? 'Branch already exists' : msg);
    }
  };

  const handleDeleteBranch = async (branch) => {
    if (stats.students?.[branch.name] > 0) {
      toast.error(`Cannot delete ${branch.name}: ${stats.students[branch.name]} students are attached.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete ${branch.name}?`)) return;
    try {
      await api.deleteBranch(branch.id);
      toast.success('Branch deleted');
      fetchBranches();
    } catch (e) {
      toast.error(e.message || 'Delete failed');
    }
  };

  const filteredBranches = branches.filter((b) => b.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark className="h-6 w-6 text-indigo-600" />
            Manage Branches
          </h2>
          <p className="text-sm text-slate-500">Add or remove academic departments and branches.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-600" />
              Add New Branch
            </h3>
            <form onSubmit={handleAddBranch} className="space-y-4">
              <Input
                label="Branch Name / Code"
                placeholder="e.g. AIML, CS, MECH"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                required
              />
              <p className="text-[10px] text-slate-400 leading-relaxed italic">
                * Names are automatically converted to uppercase. Ensure uniqueness.
              </p>
              <Button type="submit" className="w-full">
                Create Branch
              </Button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-100 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search branches..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="text-xs font-medium text-slate-400">Total: {branches.length}</div>
            </div>

            <Table
              columns={[
                {
                  header: 'Branch Name',
                  accessor: 'name',
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                        {row.name.substring(0, 2)}
                      </div>
                      <span className="font-semibold text-slate-700">{row.name}</span>
                    </div>
                  ),
                },
                {
                  header: 'Students',
                  accessor: 'name',
                  render: (row) => (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Users className="h-3.5 w-3.5" />
                      <span>{stats.students?.[row.name] || 0}</span>
                    </div>
                  ),
                },
                {
                  header: 'Subjects',
                  accessor: 'name',
                  render: (row) => (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{stats.subjects?.[row.name] || 0}</span>
                    </div>
                  ),
                },
                {
                  header: 'Actions',
                  accessor: 'id',
                  render: (row) => (
                    <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDeleteBranch(row)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ),
                },
              ]}
              data={filteredBranches}
              loading={loading}
              emptyMessage="No branches found."
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <span className="text-amber-700 font-bold text-sm">!</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800">Deletion Rule</h4>
              <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                Branches with active students cannot be deleted to maintain data integrity. Please reassign or remove students from the 'Users' tab
                before deleting a branch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

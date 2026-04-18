import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { 
  Landmark, Plus, Trash2, Search, 
  Users, BookOpen, Filter, Activity 
} from 'lucide-react';

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

  async function fetchBranches() {
    setLoading(true);
    const { data: branchData, error: bError } = await supabase
      .from('branches')
      .select('*')
      .order('name');

    if (bError) {
      toast.error('Failed to fetch branches');
    } else {
      setBranches(branchData);
      
      const { data: studentData } = await supabase.from('students').select('branch');
      const { data: subjectData } = await supabase.from('subjects').select('branch');
      
      const sStats = {};
      studentData?.forEach(s => sStats[s.branch] = (sStats[s.branch] || 0) + 1);
      
      const subStats = {};
      subjectData?.forEach(s => subStats[s.branch] = (subStats[s.branch] || 0) + 1);
      
      setStats({ students: sStats, subjects: subStats });
    }
    setLoading(false);
  }

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;

    const { error } = await supabase.from('branches').insert({
      name: newBranchName.trim().toUpperCase(),
      created_by: user.id
    });

    if (error) {
      toast.error(error.message.includes('unique_violation') ? 'Branch already exists' : error.message);
    } else {
      toast.success('Branch added successfully');
      setNewBranchName('');
      fetchBranches();
    }
  };

  const handleDeleteBranch = async (branch) => {
    if (stats.students?.[branch.name] > 0) {
      toast.error(`Cannot delete ${branch.name}: ${stats.students[branch.name]} students are attached.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${branch.name}?`)) return;

    const { error } = await supabase.from('branches').delete().eq('id', branch.id);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Branch deleted');
      fetchBranches();
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
             <Landmark className="h-4 w-4" />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Institutional Structure</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Branches</h2>
          <p className="text-sm text-slate-500 font-medium">Define and audit the structural units of the college.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="panel p-6 bg-white border-slate-200 shadow-xl shadow-slate-100/50">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Department
            </h3>
            <form onSubmit={handleAddBranch} className="space-y-6">
              <Input 
                label="Identifier (Code)"
                placeholder="e.g. AIML, CSE"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="font-bold uppercase tracking-widest"
                required
              />
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
                   Branch identifiers must be unique and represent the official academic code used in ERP.
                 </p>
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl shadow-lg shadow-indigo-100">
                Register Branch
              </Button>
            </form>
          </div>

          <div className="panel p-6 bg-slate-900 text-white border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Activity className="h-20 w-20" />
            </div>
            <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest mb-3">Integrity Rule</h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-4">
              Branches containing active students or assigned subjects cannot be deleted to prevent orphan records.
            </p>
            <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: '40%' }} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100/50 bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-4">
               <div className="relative flex-1">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                 <input 
                   type="text"
                   placeholder="Global search departments..."
                   className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all text-sm font-medium"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
               </div>
               <div className="flex items-center gap-4 px-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sort: A-Z</span>
                  </div>
                  <div className="h-4 w-px bg-slate-200" />
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">
                    {branches.length} Active
                  </span>
               </div>
            </div>

            <Table 
              columns={[
                { 
                  header: 'Department', 
                  accessor: 'name',
                  render: (row) => (
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-xs">
                        {row.name.substring(0, 2)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 tracking-tight">{row.name}</span>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase">Department ID: {row.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  )
                },
                { 
                  header: 'Entity Counts', 
                  accessor: 'name',
                  render: (row) => (
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 p-1 px-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 font-bold text-xs" title="Students">
                        <Users className="h-3 w-3 text-slate-400" />
                        {stats.students?.[row.name] || 0}
                       </div>
                       <div className="flex items-center gap-1.5 p-1 px-2.5 bg-slate-50 rounded-lg border border-slate-100 text-slate-600 font-bold text-xs" title="Subjects">
                        <BookOpen className="h-3 w-3 text-slate-400" />
                        {stats.subjects?.[row.name] || 0}
                       </div>
                    </div>
                  )
                },
                { 
                  header: 'Operations', 
                  accessor: 'id',
                  render: (row) => (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-600">
                        <Activity className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDeleteBranch(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                }
              ]}
              data={filteredBranches}
              loading={loading}
              emptyMessage="No departments registered under this criteria."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

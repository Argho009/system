import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { 
  ArrowRight, AlertTriangle, History, GraduationCap, 
  Info, Sparkles, UserCheck, ShieldAlert, 
  RefreshCw, ChevronRight, Landmark, ArrowLeftRight
} from 'lucide-react';

export const SemTransition = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [currentSem, setCurrentSem] = useState('1');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [direction, setDirection] = useState('increase'); // Spec A7: Increase or Decrease

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: bData } = await supabase.from('branches').select('*').order('name');
    if (bData) {
        setBranches(bData);
        if (bData.length > 0) setSelectedBranch(bData[0].name);
    }
    
    const { data: hData } = await supabase
      .from('semester_transitions')
      .select('*, users:triggered_by(name)')
      .order('created_at', { ascending: false });
    if (hData) setHistory(hData);
  };

  const handleFetchStudents = async () => {
    if (!selectedBranch) return toast.error('Please select a branch');
    setLoading(true);
    try {
        const { data } = await supabase
          .from('students')
          .select('id, roll_no, users(name)')
          .eq('branch', selectedBranch)
          .eq('sem', parseInt(currentSem))
          .order('roll_no');
        
        if (data) setStudents(data);
        if (data?.length === 0) toast.info('No students found for this selection');
    } catch (err) {
        toast.error('Search failed');
    } finally {
        setLoading(false);
    }
  };

  const executeTransition = async () => {
    const nextSem = direction === 'increase' ? parseInt(currentSem) + 1 : parseInt(currentSem) - 1;
    
    if (nextSem > 8) {
       toast.error('Maximum academic maturity reached (SEM 8)');
       return;
    }
    if (nextSem < 1) {
       toast.error('Minimum academic level reached (SEM 1)');
       return;
    }

    setLoading(true);
    try {
      const studentIds = students.map(s => s.id);
      
      const { error: updateError } = await supabase
        .from('students')
        .update({ sem: nextSem })
        .in('id', studentIds);

      if (updateError) throw updateError;

      await supabase.from('semester_transitions').insert({
        branch: selectedBranch,
        old_sem: parseInt(currentSem),
        new_sem: nextSem,
        affected_students: students.length,
        triggered_by: user.id
      });

      toast.success(`Advancement Complete: ${students.length} students processed.`);
      setStudents([]);
      fetchInitialData();
    } catch (err) {
      toast.error(err.message || 'Transition failed');
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
             <Sparkles className="h-4 w-4" />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Academic Advancement</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Semester Transition</h2>
          <p className="text-sm text-slate-500 font-medium">Batch process student promotion and academic cycle resets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <div className="panel p-6 bg-white border-slate-200 shadow-xl shadow-slate-100/50">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Transition Scope
              </h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Source Branch</label>
                  <select 
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-600 appearance-none"
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                  >
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Current State (SEM)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                       <button
                        key={s}
                        type="button"
                        onClick={() => setCurrentSem(s.toString())}
                        className={`h-11 rounded-xl text-xs font-bold transition-all border ${currentSem === s.toString() ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400'}`}
                       >
                         {s}
                       </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Operation Mode</label>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => setDirection('increase')}
                        className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${direction === 'increase' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                        Increase
                    </button>
                    <button 
                        onClick={() => setDirection('decrease')}
                        className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${direction === 'decrease' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-400'}`}
                    >
                        Decrease
                    </button>
                  </div>
                </div>

                <Button className="w-full h-11 rounded-xl shadow-lg shadow-indigo-100" onClick={handleFetchStudents} disabled={loading}>
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                  Identify Candidates
                </Button>
              </div>
           </div>

           <div className="panel p-6 bg-orange-50 border-orange-100">
              <div className="flex items-center gap-2 text-orange-600 font-bold text-[10px] uppercase tracking-widest mb-3">
                <ShieldAlert className="h-4 w-4" />
                Critical Protocol
              </div>
              <p className="text-[11px] text-orange-800 leading-relaxed font-medium">
                Changing student levels is a database-wide atomic operation. Ensure all records for the current term are safely archived before commit.
              </p>
           </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
           {students.length > 0 ? (
             <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100/50 bg-white animate-in slide-in-from-right-10 duration-500">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shadow-sm font-black text-xs">
                        {currentSem}
                     </div>
                     <ArrowRight className={`h-5 w-5 ${direction === 'increase' ? 'text-indigo-600' : 'text-red-500 rotate-180'}`} />
                     <div className={`w-12 h-12 rounded-2xl text-white flex items-center justify-center shadow-lg font-black text-xs ${direction === 'increase' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-red-500 shadow-red-100'}`}>
                        {direction === 'increase' ? parseInt(currentSem)+1 : parseInt(currentSem)-1}
                     </div>
                     <div className="ml-4">
                        <h4 className="font-bold text-slate-900 tracking-tight">{direction === 'increase' ? 'Promoting' : 'Regressing'} {students.length} Students</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedBranch} Cohort</p>
                     </div>
                   </div>
                   <Button variant={direction === 'increase' ? 'indigo' : 'danger'} onClick={() => setIsConfirmOpen(true)} className="px-8 h-12 rounded-2xl shadow-lg">
                      Commit Operation
                   </Button>
                </div>

                <div className="max-h-[500px] overflow-auto">
                   <Table 
                    columns={[
                        { header: 'Student Registry', accessor: 'users', render: r => (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                                    {r.users?.name?.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{r.users?.name}</span>
                                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">{r.roll_no}</span>
                                </div>
                            </div>
                        )},
                        { header: 'Current Stage', accessor: 'id', render: () => <Badge variant="slate" className="uppercase text-[9px]">Semester {currentSem}</Badge> },
                        { header: 'Target State', accessor: 'id', render: () => <Badge variant={direction === 'increase' ? 'indigo' : 'danger'} className="uppercase text-[9px]">Semester {direction === 'increase' ? parseInt(currentSem)+1 : parseInt(currentSem)-1}</Badge> },
                    ]}
                    data={students}
                   />
                </div>
             </div>
           ) : (
             <div className="panel h-[400px] flex flex-col items-center justify-center border-slate-200 border-dashed bg-slate-50/50 text-slate-400">
                <div className="p-6 bg-white rounded-3xl shadow-sm mb-4 border border-slate-100">
                   <GraduationCap className="h-10 w-10 opacity-20" />
                </div>
                <p className="text-sm font-bold tracking-tight text-slate-900 border-b border-white pb-2 mb-2">Ready to Pipeline</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identify candidates to start the transition</p>
             </div>
           )}

           <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 pl-2">
               <History className="h-4 w-4" />
               Historical Registry
            </h3>
            <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100/30 bg-white">
                <Table 
                columns={[
                    { header: 'Department', accessor: 'branch', render: r => <span className="font-black text-slate-700 text-xs">{r.branch.toUpperCase()}</span> },
                    { header: 'Progression', accessor: 'id', render: (row) => (
                        <div className="flex items-center gap-2 text-xs font-bold">
                            <span className="text-slate-400">SEM {row.old_sem}</span>
                            <ChevronRight className={`h-3 w-3 ${row.new_sem > row.old_sem ? 'text-indigo-300' : 'text-red-300'}`} />
                            <span className={row.new_sem > row.old_sem ? 'text-indigo-600' : 'text-red-500'}>SEM {row.new_sem}</span>
                        </div>
                    )},
                    { header: 'Batch Size', accessor: 'affected_students', render: r => <span className="text-xs font-medium text-slate-500">{r.affected_students} Users</span> },
                    { header: 'Audit', accessor: 'users', render: (row) => <span className="text-[11px] font-medium text-slate-600">{row.users?.name || 'System'}</span> },
                    { header: 'Timestamp', accessor: 'created_at', render: (row) => <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(row.created_at).toLocaleString('en-IN')}</span> }
                ]} 
                data={history} 
                emptyMessage="No historical progressions recorded."
                />
            </div>
           </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeTransition}
        title={direction === 'increase' ? 'Commit Academic Advancement?' : 'Commit Academic Regression?'}
        message={`This will move ${students.length} students from the ${selectedBranch} cohort into Semester ${direction === 'increase' ? parseInt(currentSem)+1 : parseInt(currentSem)-1}. This is recorded in the audit registry.`}
        variant={direction === 'increase' ? 'indigo' : 'danger'}
        confirmText="Confirm Operation"
      />
    </div>
  );
};

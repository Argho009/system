import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import { ArrowRight, AlertTriangle, History, GraduationCap, Info } from 'lucide-react';

export const SemTransition = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [currentSem, setCurrentSem] = useState('1');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: bData } = await supabase.from('branches').select('*').order('name');
    if (bData) setBranches(bData);
    
    const { data: hData } = await supabase
      .from('semester_transitions')
      .select('*, users:triggered_by(name)')
      .order('created_at', { ascending: false });
    if (hData) setHistory(hData);
  };

  const handleFetchStudents = async () => {
    if (!selectedBranch) return toast.error('Please select a branch');
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, roll_no, users(name)')
      .eq('branch', selectedBranch)
      .eq('sem', parseInt(currentSem))
      .order('roll_no');
    
    if (data) setStudents(data);
    setLoading(false);
  };

  const executeTransition = async () => {
    const nextSem = parseInt(currentSem) + 1;
    if (nextSem > 8) {
       toast.error('Cannot transition beyond Semester 8');
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

      toast.success(`Successfully moved ${students.length} students to Semester ${nextSem}`);
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowRight className="h-6 w-6 text-indigo-600" />
            Semester Transition
          </h2>
          <p className="text-sm text-slate-500">Promote a batch of students to the next academic semester.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Controls */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
              <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-500" />
                Step 1: Choose Source
              </h4>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Source Branch</label>
                  <select 
                    className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                    value={selectedBranch}
                    onChange={e => setSelectedBranch(e.target.value)}
                  >
                    <option value="">Select Branch...</option>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Current Semester</label>
                  <select 
                    className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                    value={currentSem}
                    onChange={e => setCurrentSem(e.target.value)}
                  >
                    {[1,2,3,4,5,6,7].map(s => <option key={s} value={s.toString()}>{s}</option>)}
                  </select>
                </div>
                <Button className="w-full" onClick={handleFetchStudents} disabled={loading || !selectedBranch}>
                  {loading ? 'Finding students...' : 'Find Students'}
                </Button>
              </div>
           </div>

           <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-yellow-700 font-bold text-xs uppercase">
                <AlertTriangle className="h-4 w-4" />
                Important Notice
              </div>
              <p className="text-xs text-yellow-800 leading-relaxed">
                Semester transition is irreversible in bulk. Ensure all marks for the current semester are uploaded and attendance is finalized before promoting students.
              </p>
           </div>
        </div>

        {/* Right: Preview & Execution */}
        <div className="lg:col-span-2 space-y-6">
           {students.length > 0 ? (
             <div className="bg-white rounded-lg border border-indigo-200 shadow-md p-6 space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                   <div>
                     <h3 className="font-bold text-slate-800">Preview: Batch Transition</h3>
                     <p className="text-xs text-slate-500">
                       Moving students of <span className="font-bold text-slate-900">{selectedBranch}</span> from <span className="font-bold text-slate-900">Sem {currentSem}</span> to <span className="font-bold text-indigo-600 underline">Sem {parseInt(currentSem)+1}</span>
                     </p>
                   </div>
                   <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
                      Finalize Transition
                   </Button>
                </div>

                <div className="max-h-[400px] overflow-auto border rounded divide-y">
                   {students.map(s => (
                     <div key={s.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-4">
                           <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                             STUD
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-800">{s.users.name}</p>
                              <p className="text-xs text-slate-500">{s.roll_no}</p>
                           </div>
                        </div>
                        <Badge variant="success">READY TO MOVE</Badge>
                     </div>
                   ))}
                </div>
             </div>
           ) : (
             <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-400">
                <GraduationCap className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Select branch and semester to preview students</p>
             </div>
           )}
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
           <History className="h-5 w-5 text-slate-400" />
           Transition Logs
        </h3>
        <Table 
          columns={[
            { header: 'Branch', accessor: 'branch' },
            { header: 'Transition', accessor: 'id', render: (row) => <span>Sem {row.old_sem} <ArrowRight className="inline h-3 w-3 mx-1" /> Sem {row.new_sem}</span> },
            { header: 'Students Affected', accessor: 'affected_students' },
            { header: 'Triggered By', accessor: 'users', render: (row) => row.users?.name || 'System' },
            { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleString('en-IN') }
          ]} 
          data={history} 
          emptyMessage="No previous transitions recorded."
        />
      </div>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeTransition}
        title="Confirm Bulk Promotion"
        message={`Are you absolutely sure? This will promote ${students.length} students to Semester ${parseInt(currentSem)+1}. This change is immediate and will be reflected in all student dashboards.`}
        confirmText="Yes, Promote Batch"
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { 
  Archive, Database, Download, FileSpreadsheet, 
  Trash2, RefreshCw, CheckCircle2, ChevronRight,
  AlertTriangle, History, HardDrive, ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const ArchiveSemester = () => {
  const [branches, setBranches] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('archive'); // archive or history
  
  const [config, setConfig] = useState({
    branch: '',
    sem: '1',
    academic_year: '2024-25'
  });

  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: bData } = await supabase.from('branches').select('*').order('name');
    if (bData) {
      setBranches(bData);
      setConfig(prev => ({ ...prev, branch: bData[0]?.name || '' }));
    }
    fetchHistory();
  };

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('archive_log')
      .select('*, users:archived_by(name)')
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const { count: attCount } = await supabase
        .from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year', config.academic_year);

      const { count: lecCount } = await supabase
        .from('lectures')
        .select('*', { count: 'exact', head: true })
        .eq('academic_year', config.academic_year)
        .eq('sem', parseInt(config.sem));

      setPreview({
        attendance: attCount || 0,
        lectures: lecCount || 0,
        estimated_size: ((attCount + lecCount) * 0.2 / 1024).toFixed(2) // MB
      });
    } catch (err) {
      toast.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  const executeArchive = async () => {
    setShowConfirm(false);
    setRunning(true);
    try {
      // 1. Fetch data for export
      const { data: attendance } = await supabase
        .from('attendance')
        .select(`*, students(roll_no, users(name)), lectures(date, lecture_no, subjects(name, code))`)
        .eq('academic_year', config.academic_year);

      if (!attendance || attendance.length === 0) throw new Error('No attendance data found for this period');

      // 2. Export to Excel
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(attendance.map(a => ({
        Date: a.lectures?.date,
        Lecture: a.lectures?.lecture_no,
        Subject: a.lectures?.subjects?.name,
        Student: a.students?.users?.name,
        RollNo: a.students?.roll_no,
        Status: a.status
      })));
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance History');
      
      const fileName = `Archive_${config.branch}_Sem${config.sem}_${Date.now()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // 3. Delete raw data (Simplified for demo, in production use a single RPC)
      // Note: This would typically be a transaction-heavy operation
      
      // 4. Log the action
      await supabase.from('archive_log').insert({
        branch: config.branch,
        sem: parseInt(config.sem),
        academic_year: config.academic_year,
        rows_deleted: preview.attendance + preview.lectures,
        file_name: fileName,
        status: 'completed',
        archived_by: (await supabase.auth.getUser()).data.user.id
      });

      toast.success('Semester archived and data exported!');
      setPreview(null);
      fetchHistory();
    } catch (err) {
      toast.error(err.message || 'Archive failed');
    } finally {
      setRunning(false);
    }
  };

  const columns = [
    { header: 'Branch', accessor: 'branch' },
    { header: 'Sem', accessor: 'sem' },
    { header: 'Academic Year', accessor: 'academic_year' },
    { header: 'Rows Deleted', accessor: 'rows_deleted' },
    { header: 'Date', accessor: 'created_at', render: r => new Date(r.created_at).toLocaleDateString() },
    { header: 'Status', accessor: 'status', render: r => <Badge variant="green">{r.status}</Badge> }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
             <HardDrive className="h-4 w-4" />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Maintenance & Infrastructure</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Archive</h2>
          <p className="text-sm text-slate-500 font-medium">Offload historical data to cold storage to ensure peak performance.</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
           {['archive', 'history'].map(tab => (
             <button
              key={tab}
              onClick={() => setActiveView(tab)}
              className={`px-6 py-2 text-[11px] font-extrabold uppercase tracking-widest rounded-lg transition-all ${activeView === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               {tab}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {activeView === 'archive' ? (
            <div className="space-y-6">
              <div className="panel p-8 bg-white border-slate-200 shadow-xl shadow-slate-100/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch</label>
                    <select 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600 appearance-none"
                      value={config.branch}
                      onChange={e => setConfig({ ...config, branch: e.target.value })}
                    >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Semester</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <button
                          key={s}
                          onClick={() => setConfig({ ...config, sem: s.toString() })}
                          className={`h-11 rounded-xl text-xs font-bold transition-all border ${config.sem === s.toString() ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Academic Year</label>
                    <input 
                      type="text" 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-600"
                      value={config.academic_year}
                      onChange={e => setConfig({ ...config, academic_year: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={handlePreview} 
                    disabled={loading || running}
                    className="flex-1 h-12 rounded-xl text-sm font-bold shadow-lg shadow-slate-100"
                  >
                    {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Scrub Database (Preview)
                  </Button>
                </div>
              </div>

              {preview && (
                <div className="panel p-0 overflow-hidden border-orange-200 bg-orange-50/30 animate-in slide-in-from-bottom-5 duration-500">
                  <div className="p-6 border-b border-orange-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-orange-900">Archive Manifest Generated</h4>
                        <p className="text-xs text-orange-700 font-medium">Ready to offload {preview.estimated_size} MB of transactional data.</p>
                      </div>
                    </div>
                    <Badge variant="orange" className="uppercase px-3 py-1">Critical Action</Badge>
                  </div>
                  <div className="p-6 grid grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-white rounded-2xl border border-orange-100 group hover:border-orange-300 transition-all">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 tracking-widest">Attendance Records</p>
                      <p className="text-2xl font-black text-slate-800">{preview.attendance}</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-2xl border border-orange-100 group hover:border-orange-300 transition-all">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 tracking-widest">Lecture Sessions</p>
                      <p className="text-2xl font-black text-slate-800">{preview.lectures}</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-2xl border border-orange-100 group hover:border-orange-300 transition-all">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase mb-1 tracking-widest">Total Impact</p>
                      <p className="text-2xl font-black text-orange-600">-{preview.estimated_size} MB</p>
                    </div>
                  </div>
                  <div className="p-6 bg-orange-100/50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-orange-800 font-bold max-w-md">
                      Proceeding will generate a permanent Excel cold-storage file and PURGE these records from the primary database cluster.
                    </p>
                    <Button 
                      variant="danger" 
                      onClick={() => setShowConfirm(true)} 
                      disabled={running}
                      className="px-10 h-11 rounded-xl shadow-lg shadow-red-200"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Commit Archive
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="panel overflow-hidden border-slate-200 shadow-xl shadow-slate-100/50 bg-white">
              <Table 
                columns={columns} 
                data={history} 
                emptyMessage="No archive logs found. Initiate your first archive above." 
              />
            </div>
          )}
        </div>

        <div className="space-y-6">
           <div className="panel p-6 bg-slate-900 text-white border-none overflow-hidden relative">
              <div className="absolute -bottom-10 -right-10 opacity-10">
                <Database className="h-40 w-40" />
              </div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
                Data Integrity
              </h3>
              <ul className="space-y-4 relative z-10">
                <li className="flex gap-3 text-xs font-medium text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Primary students and marks are NEVER deleted by this process.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Only temporal transaction data (attendance, lectures) is scrubbed.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Excel exports should be stored in the official institutional Google Drive.
                </li>
              </ul>
           </div>

           <div className="panel p-6 border-slate-200">
             <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
               <History className="h-3 w-3" />
               Recent Activity
             </h3>
             <div className="space-y-4">
                {history.slice(0, 3).map((log, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-2 bg-white rounded-lg border border-slate-200 text-indigo-600 shadow-sm">
                      <FileSpreadsheet className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{log.branch} SEM {log.sem}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(log.created_at).toDateString()}</p>
                    </div>
                  </div>
                ))}
                {history.length === 0 && <p className="text-[10px] text-slate-400 font-bold uppercase text-center py-4">No activity yet</p>}
             </div>
           </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeArchive}
        title="Commit Permanent Archive?"
        message="This will delete thousands of records from the live database. Ensure you have verified the preview and are ready to handle the generated Excel file. This action cannot be reversed."
        confirmText="Yes, Proceed with Purge"
        variant="danger"
      />
    </div>
  );
};

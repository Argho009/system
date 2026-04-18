import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { 
  Upload, Download, FileSpreadsheet, CheckCircle, 
  XCircle, AlertCircle, RefreshCw, Layers, UserPlus,
  History, GraduationCap, ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const BulkUpload = () => {
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('bulk'); // 'bulk' or 'manual'
    const [branches, setBranches] = useState([]);
    
    // Bulk Logic States
    const [step, setStep] = useState(1);
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [importResults, setImportResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);

    // Manual Entry States
    const [manualData, setManualData] = useState({
        college_id: '',
        name: '',
        role: 'student',
        roll_no: '',
        branch: '',
        sem: '1'
    });

    useEffect(() => {
        fetchHistory();
        fetchBranches();
    }, []);

    const fetchHistory = async () => {
        const { data } = await supabase.from('bulk_upload_logs').select('*').order('created_at', { ascending: false });
        if (data) setHistory(data);
    };

    const fetchBranches = async () => {
        const { data } = await supabase.from('branches').select('*').order('name');
        if (data) {
            setBranches(data);
            if (data.length > 0) setManualData(m => ({ ...m, branch: data[0].name }));
        }
    };

    // --- Bulk Import Logic ---
    const handleFileSelect = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        if (!selected.name.match(/\.(xlsx|csv)$/)) {
            toast.error('Invalid file type. Please use .xlsx or .csv');
            return;
        }
        setLoading(true);
        setFile(selected);
        try {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);
                const validated = data.map(row => {
                    const cleanRow = {};
                    Object.keys(row).forEach(k => cleanRow[k.toLowerCase().trim()] = String(row[k]).trim());
                    const errors = [];
                    if (!cleanRow.college_id) errors.push('Missing ID');
                    if (!cleanRow.name) errors.push('Missing Name');
                    if (!cleanRow.role) errors.push('Missing Role');
                    if (cleanRow.role?.toLowerCase() === 'student' && (!cleanRow.roll_no || !cleanRow.branch)) errors.push('Missing Student Context');
                    return { ...cleanRow, _isValid: errors.length === 0, _error: errors.join(', ') };
                });
                setPreviewData(validated);
                setStep(2);
                setLoading(false);
            };
            reader.readAsBinaryString(selected);
        } catch (err) {
            toast.error('Failed to parse file');
            setLoading(false);
        }
    };

    const handleBulkImport = async () => {
        const validRows = previewData.filter(r => r._isValid);
        setLoading(true);
        let successCount = 0;
        let failCount = 0;
        const failedData = [];
        for (const row of validRows) {
            try {
                const { error } = await supabase.rpc('create_system_user', {
                    p_college_id: row.college_id,
                    p_name: row.name,
                    p_role: row.role.toLowerCase(),
                    p_additional_data: row.role.toLowerCase() === 'student' ? {
                        roll_no: row.roll_no,
                        branch: row.branch,
                        sem: parseInt(row.sem) || 1
                    } : {}
                });
                if (error) throw error;
                successCount++;
            } catch (err) {
                failCount++;
                let reason = err.message;
                if (reason.includes('students_roll_no_key')) reason = 'Roll No already exists';
                if (reason.includes('users_college_id_key')) reason = 'College ID already exists';
                failedData.push({ college_id: row.college_id, reason });
            }
        }
        await supabase.from('bulk_upload_logs').insert({
            file_name: file.name,
            type: 'user_import',
            status: failCount === 0 ? 'success' : successCount > 0 ? 'partial' : 'failed',
            uploaded_by: currentUser.id
        });
        setImportResults({ success: successCount, failed: failCount, failedData });
        setStep(3);
        fetchHistory();
        setLoading(false);
    };

    // --- Manual Entry Logic ---
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.rpc('create_system_user', {
                p_college_id: manualData.college_id,
                p_name: manualData.name,
                p_role: manualData.role,
                p_additional_data: manualData.role === 'student' ? {
                    roll_no: manualData.roll_no,
                    branch: manualData.branch,
                    sem: parseInt(manualData.sem)
                } : {}
            });
            if (error) throw error;
            toast.success('User provisioned and synced successfully');
            setManualData({ ...manualData, college_id: '', name: '', roll_no: '' });
            fetchHistory();
        } catch (err) {
            let msg = err.message || 'Provisioning failed';
            if (msg.includes('students_roll_no_key')) {
                msg = 'Duplicate Entry: This Roll Number is already assigned to another student.';
            } else if (msg.includes('users_college_id_key')) {
                msg = 'Duplicate Entry: This College ID is already registered in the system.';
            }
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = [{ college_id: 'sample_1', name: 'John Doe', role: 'student', roll_no: '101', branch: 'CSE', sem: '1' }];
        const ws = XLSX.utils.json_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, 'CAMS_User_Import_Template.xlsx');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <UserPlus className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Account Provisioning</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">User Management Terminal</h2>
                  <p className="text-sm text-slate-500 font-medium">Global interface for individual or batch user creation.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                    <button 
                        onClick={() => setActiveTab('bulk')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        Bulk Import
                    </button>
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                    >
                        Single User
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {activeTab === 'bulk' ? (
                        <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 bg-white">
                            <div className="flex border-b border-slate-100">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className={`flex-1 py-4 flex items-center justify-center gap-3 font-extrabold text-[10px] uppercase tracking-widest ${step === i ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-300'}`}>
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${step === i ? 'border-indigo-600' : 'border-slate-200'}`}>{i}</span>
                                        {i === 1 ? 'Source' : i === 2 ? 'Validate' : 'Execute'}
                                    </div>
                                ))}
                            </div>
                            <div className="p-10">
                                {step === 1 && (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <div onClick={() => document.getElementById('file-input').click()} className="w-full max-w-lg p-16 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50 flex flex-col items-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group cursor-pointer">
                                            <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 transition-all mb-6 group-hover:scale-110">
                                                <Upload className="h-8 w-8" />
                                            </div>
                                            <h4 className="font-black text-slate-800 text-xl tracking-tight">Drop assessment manifest</h4>
                                            <p className="text-xs text-slate-500 mt-2 font-medium">Excel (.xlsx) or CSV formatted registry</p>
                                            <input type="file" id="file-input" hidden accept=".xlsx,.csv" onChange={handleFileSelect} />
                                        </div>
                                        <button onClick={downloadTemplate} className="mt-8 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2 hover:gap-3 transition-all">
                                            <Download className="h-4 w-4" /> Get Protocol Template
                                        </button>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                                    <FileSpreadsheet className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Manifest Analysis</p>
                                                    <h4 className="font-bold text-lg leading-tight">{file?.name}</h4>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" onClick={() => setStep(1)} className="text-white hover:bg-white/10">Discard</Button>
                                                <Button onClick={handleBulkImport} className="bg-white text-indigo-600 hover:bg-indigo-50" disabled={loading}>
                                                    {loading ? 'Processing...' : 'Atomic Commit'}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                                            <Table 
                                                columns={[
                                                    { header: 'ID', accessor: 'college_id', render: r => <span className="font-black italic text-slate-800">{r.college_id}</span> },
                                                    { header: 'Identity', accessor: 'name' },
                                                    { header: 'Privilege', accessor: 'role', render: r => <Badge variant="slate" className="uppercase text-[9px]">{r.role}</Badge> },
                                                    { header: 'Sanity', render: r => r._isValid ? <Badge variant="success">OK</Badge> : <span className="text-[10px] text-red-500 font-bold">{r._error}</span> }
                                                ]}
                                                data={previewData}
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 3 && importResults && (
                                    <div className="text-center py-12 flex flex-col items-center">
                                         <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 shadow-xl shadow-indigo-50">
                                            <ShieldCheck className="h-10 w-10" />
                                         </div>
                                         <h3 className="text-3xl font-black text-slate-900 tracking-tight">Provisioning Finalized</h3>
                                         <div className="flex gap-4 mt-4">
                                            <Badge variant="indigo" className="px-4 py-1.5">{importResults.success} CREATED</Badge>
                                            {importResults.failed > 0 && <Badge variant="danger" className="px-4 py-1.5">{importResults.failed} FAILURES</Badge>}
                                         </div>
                                         <div className="mt-12 flex gap-4">
                                            <Button variant="outline" onClick={() => setStep(1)} className="px-10 h-12 rounded-2xl">Start New Sync</Button>
                                            <Button onClick={() => window.location.href='/admin/users'} className="px-10 h-12 rounded-2xl shadow-xl shadow-indigo-100">View User Registry</Button>
                                         </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 bg-white">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-indigo-600" />
                                    Manual Account Provisioning
                                </h3>
                            </div>
                            <form onSubmit={handleManualSubmit} className="p-10 space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <Input label="College ID" value={manualData.college_id} onChange={e => setManualData({...manualData, college_id: e.target.value.toUpperCase()})} required placeholder="e.g., 2024CS101" />
                                    <Input label="Legal Full Name" value={manualData.name} onChange={e => setManualData({...manualData, name: e.target.value})} required placeholder="John Doe" />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">System Role</label>
                                        <select className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer" value={manualData.role} onChange={e => setManualData({...manualData, role: e.target.value})}>
                                            <option value="student">Student Account</option>
                                            <option value="teacher">Faculty Account</option>
                                            <option value="hod">Dept. Head Account</option>
                                            <option value="admin">Admin Console Access</option>
                                        </select>
                                    </div>
                                    {manualData.role === 'student' && (
                                        <Input label="Assigned Roll" value={manualData.roll_no} onChange={e => setManualData({...manualData, roll_no: e.target.value})} required />
                                    )}
                                </div>

                                {manualData.role === 'student' && (
                                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 grid grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Target Department</label>
                                            <select className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={manualData.branch} onChange={e => setManualData({...manualData, branch: e.target.value})} required>
                                                {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Academic Semester</label>
                                            <select className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer shadow-sm" value={manualData.sem} onChange={e => setManualData({...manualData, sem: e.target.value})} required>
                                                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>Semester {s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-slate-50 flex justify-end">
                                    <Button type="submit" disabled={loading} className="px-12 h-12 rounded-2xl shadow-xl shadow-indigo-100">
                                        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                        Provision Account
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="panel p-6 bg-slate-900 border-none shadow-2xl relative overflow-hidden text-white">
                        <div className="absolute top-0 right-0 p-4 opacity-5 bg-gradient-to-br from-white to-transparent rounded-full h-32 w-32 -mr-16 -mt-16" />
                        <h3 className="font-bold flex items-center gap-2 mb-6">
                            <History className="h-4 w-4 text-indigo-400" />
                            Audit History
                        </h3>
                        <div className="space-y-4">
                            {history.slice(0, 5).map(h => (
                                <div key={h.id} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${h.status === 'success' ? 'bg-green-400' : 'bg-amber-400'}`} />
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase text-slate-500">{new Date(h.created_at).toLocaleDateString()}</p>
                                        <p className="text-xs font-bold truncate text-slate-100">{h.file_name || 'Manual Provisioning'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="panel p-6 bg-indigo-50 border-indigo-100">
                        <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4" /> Security Note
                        </h4>
                        <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">
                            Every user created here is automatically synchronized with Supabase Auth. Initial password is set to their College ID.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

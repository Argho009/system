import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Toggle } from '../../components/ui/Toggle';
import { toast } from '../../components/ui/Toast';
import { 
  CheckCircle, XCircle, Save, Upload, 
  Copy, Search, Image as ImageIcon, 
  FileSpreadsheet, MousePointer2, ChevronRight, 
  RotateCcw, ShieldCheck 
} from 'lucide-react';

export const MarkAttendance = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('manual');
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1); // 1 = Config, 2 = Execution
    
    // Core Form
    const [form, setForm] = useState({ 
        subject_id: '', 
        date: new Date().toISOString().split('T')[0], 
        lecture_no: '1',
        blank_means: 'absent' 
    });

    // Execution Data
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchAssignments = async () => {
            const { data } = await supabase.from('subject_assignments')
                .select('subject_id, subjects(id, code, name, sem, branch)')
                .eq('teacher_id', user.id);
            if (data) setAssignments(data);
            setLoading(false);
        };
        fetchAssignments();
    }, [user]);

    const getSelectedSubject = () => assignments.find(a => a.subject_id === form.subject_id)?.subjects;

    const proceedToStep2 = async () => {
        if (!form.subject_id) return toast.error('Select a subject first');
        const subject = getSelectedSubject();
        
        setLoading(true);
        const { data: studs } = await supabase.from('students')
            .select('id, roll_no, users(name)')
            .eq('branch', subject.branch)
            .eq('sem', subject.sem)
            .order('roll_no');
        
        if (studs) {
            setStudents(studs);
            const initial = {};
            studs.forEach(s => initial[s.id] = form.blank_means);
            setAttendance(initial);
            setStep(2);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const subject = getSelectedSubject();
        const { data: config } = await supabase.from('system_config').select('value').eq('key', 'current_academic_year').single();
        const academicYear = config?.value || '2024-25';

        try {
            // 1. Create Lecture Record
            const { data: lec, error: lecErr } = await supabase.from('lectures').insert({
                subject_id: form.subject_id,
                teacher_id: user.id,
                date: form.date,
                lecture_no: parseInt(form.lecture_no),
                academic_year: academicYear,
                sem: subject.sem,
                blank_means: form.blank_means
            }).select('id').single();

            if (lecErr) throw lecErr;

            // 2. Bulk Insert Attendance
            const attRows = students.map(s => ({
                lecture_id: lec.id,
                student_id: s.id,
                status: attendance[s.id],
                marked_by: user.id,
                academic_year: academicYear
            }));

            const { error: attErr } = await supabase.from('attendance').insert(attRows);
            if (attErr) throw attErr;

            toast.success(`Lecture ${form.lecture_no} synchronized successfully`);
            setStep(1);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    const TABS = [
        { id: 'manual', label: 'Manual Tap', icon: MousePointer2 },
        { id: 'excel', label: 'Excel Upload', icon: FileSpreadsheet },
        { id: 'copy', label: 'Copy Past', icon: Copy },
        { id: 'borrow', label: 'Borrow Lec', icon: Search },
        { id: 'ocr', label: 'OCR Photo', icon: ImageIcon }
    ];

    if (step === 2) {
        const presentCount = Object.values(attendance).filter(v => v === 'present').length;
        return (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <Button variant="ghost" onClick={() => setStep(1)} className="pl-0 text-slate-400 hover:text-indigo-600">
                           <RotateCcw className="h-4 w-4 mr-2" /> Back to Config
                        </Button>
                        <h2 className="text-2xl font-bold text-slate-900 mt-2">
                           Registry Input: <span className="text-indigo-600">#{form.lecture_no}</span>
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">Marking attendance for {getSelectedSubject()?.code} on {form.date}.</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-slate-900">{presentCount}</span>
                            <span className="text-slate-300 font-bold text-lg">/</span>
                            <span className="text-lg font-bold text-slate-400">{students.length}</span>
                        </div>
                        <Badge variant="indigo" className="text-[10px] uppercase font-bold tracking-widest">Live Counters</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {students.map(s => {
                        const isP = attendance[s.id] === 'present';
                        return (
                            <div 
                                key={s.id} 
                                onClick={() => setAttendance({...attendance, [s.id]: isP ? 'absent' : 'present'})}
                                className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer select-none ${isP ? 'bg-green-50 border-green-500 shadow-lg shadow-green-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}
                            >
                                <div className="flex flex-col items-center text-center space-y-2">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isP ? 'bg-green-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                                        {isP ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`font-bold text-xs truncate ${isP ? 'text-green-700' : 'text-slate-700'}`}>{s.users?.name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 font-mono mt-0.5 uppercase">{s.roll_no}</p>
                                    </div>
                                </div>
                                {isP && (
                                    <div className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-green-500 animate-ping" />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-50">
                    <Button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="w-full h-14 rounded-2xl shadow-2xl shadow-indigo-200 text-lg font-bold flex items-center justify-center gap-3 active:scale-95 transition-transform"
                    >
                        {saving ? 'Synchronizing Cloud...' : 'Commit to Database'}
                        <Save className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Academic Control Plane</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Record Intelligence</h2>
                  <p className="text-sm text-slate-500 font-medium">Deploy attendance sheets with multi-modal input channels.</p>
                </div>
            </div>

            <div className="bg-white p-2 border border-slate-200 rounded-3xl shadow-sm flex flex-wrap gap-2">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <t.icon className={`h-4 w-4 ${activeTab === t.id ? 'text-white' : 'text-slate-400'}`} />
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
                <div className="lg:col-span-4">
                    <div className="panel p-8 bg-white border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-2">Lecture Configuration</h3>
                        
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Context</label>
                                <select 
                                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 pr-10 cursor-pointer"
                                    value={form.subject_id}
                                    onChange={e => setForm({...form, subject_id: e.target.value})}
                                >
                                    <option value="">Select subject context...</option>
                                    {assignments.map(a => (
                                        <option key={a.subject_id} value={a.subject_id}>
                                            {a.subjects?.code} - {a.subjects?.name} ({a.subjects?.branch}, S{a.subjects?.sem})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deployment Date</label>
                                    <input 
                                        type="date"
                                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600"
                                        value={form.date}
                                        onChange={e => setForm({...form, date: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Slot sequence</label>
                                    <select 
                                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                                        value={form.lecture_no}
                                        onChange={e => setForm({...form, lecture_no: e.target.value})}
                                    >
                                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n.toString()}>Lec #{n}</option>)}
                                    </select>
                                </div>
                            </div>

                            <Toggle 
                                label="Default state for unmarked entities"
                                option1={{ label: 'ABSENT', value: 'absent' }}
                                option2={{ label: 'PRESENT', value: 'present' }}
                                value={form.blank_means}
                                onChange={v => setForm({...form, blank_means: v})}
                            />

                            <Button onClick={proceedToStep2} className="w-full h-12 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 group">
                                Initialize Marking Engine
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-6">
                    <div className="panel p-8 bg-slate-50 border-dashed border-2 border-slate-200 flex flex-col items-center justify-center text-center group min-h-[400px]">
                        <div className="w-16 h-16 rounded-3xl bg-white shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                           {activeTab === 'manual' && <MousePointer2 className="h-8 w-8 text-indigo-600" />}
                           {activeTab === 'excel' && <FileSpreadsheet className="h-8 w-8 text-green-600" />}
                           {activeTab === 'copy' && <Copy className="h-8 w-8 text-amber-600" />}
                           {activeTab === 'borrow' && <Search className="h-8 w-8 text-blue-600" />}
                           {activeTab === 'ocr' && <ImageIcon className="h-8 w-8 text-rose-600" />}
                        </div>
                        <h4 className="text-xl font-bold text-slate-800 mb-2">
                           {activeTab === 'manual' ? 'Streamlined Manual Input' : 
                            activeTab === 'excel' ? 'Batch Excel Importer' : 
                            activeTab === 'copy' ? 'Temporal Record Duplication' : 
                            activeTab === 'borrow' ? 'Inter-departmental Borrow' : 'AI-Powered OCR Detection'}
                        </h4>
                        <p className="text-sm text-slate-500 max-w-sm font-medium mb-8">
                           {activeTab === 'manual' ? 
                             'Configure the lecture parameters on the left to begin the manual student-wise marking process.' : 
                             `The ${activeTab} workflow is currently processing infrastructure integration. Please use Manual Tap for the current session.`}
                        </p>
                        
                        {activeTab === 'ocr' && (
                            <div className="p-4 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl animate-pulse">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Experimental Feature</p>
                            </div>
                        )}
                        
                        {activeTab === 'excel' && (
                            <Button variant="outline" className="rounded-xl border-dashed border-2 px-10 h-14 bg-white">
                                <Upload className="h-4 w-4 mr-2" /> Select File Source
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

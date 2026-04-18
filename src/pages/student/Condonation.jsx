import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { 
  FilePlus, ShieldCheck, History, 
  Upload, Clock, FileText, 
  CheckCircle2, AlertCircle 
} from 'lucide-react';

export const StudentCondonation = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ subject_id: '', lectures: '', reason: '', file: null });

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: stu } = await supabase.from('students')
                .select('id, branch, sem')
                .eq('user_id', user.id)
                .single();
            
            if (stu) {
                setStudent(stu);
                const [subRes, reqRes] = await Promise.all([
                    supabase.from('subjects').select('id, code, name').eq('branch', stu.branch).eq('sem', stu.sem),
                    supabase.from('attendance_condonation').select('*, subjects(code, name)').eq('student_id', stu.id).order('created_at', { ascending: false })
                ]);
                setSubjects(subRes.data || []);
                setRequests(reqRes.data || []);
            }
        } catch (err) {
            toast.error('Context load failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject_id || !form.lectures || !form.reason) return;

        setSubmitting(true);
        try {
            let docUrl = null;
            if (form.file) {
                const fileName = `stu-${student.id}-${Date.now()}-${form.file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('condonation_docs')
                    .upload(fileName, form.file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('condonation_docs').getPublicUrl(fileName);
                docUrl = publicUrl;
            }

            const { error } = await supabase.from('attendance_condonation').insert({
                student_id: student.id,
                subject_id: form.subject_id,
                lectures_condoned: parseInt(form.lectures),
                reason: form.reason,
                document_url: docUrl,
                status: 'pending',
                requested_by: user.id
            });

            if (error) throw error;
            toast.success('Application submitted for Teacher Review');
            setIsModalOpen(false);
            setForm({ subject_id: '', lectures: '', reason: '', file: null });
            fetchData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 text-indigo-600 mb-1">
                     <FilePlus className="h-4 w-4" />
                     <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Medical & Academic Leave</span>
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Condonation Portal</h2>
                   <p className="text-sm text-slate-500 font-medium">Apply for attendance exemptions due to valid medical or extracurricular reasons.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="rounded-xl shadow-lg shadow-indigo-100">
                    Apply for Condonation
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 bg-white">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <History className="h-4 w-4 text-indigo-600" />
                                Application History
                            </h3>
                            <Badge variant="indigo" className="text-[10px] uppercase font-bold tracking-tighter">
                                {requests.length} Submissions
                            </Badge>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {requests.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 italic">No previous applications found.</div>
                            ) : requests.map((req) => (
                                <div key={req.id} className="p-6 flex items-start justify-between hover:bg-slate-50 transition-colors">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="slate" className="font-mono">{req.subjects?.code}</Badge>
                                            <span className="text-xs font-bold text-slate-800">{req.subjects?.name}</span>
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed max-w-md">{req.reason}</p>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <Clock className="h-3 w-3" />
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                <FileText className="h-3 w-3" />
                                                {req.lectures_condoned} Lectures
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <Badge variant={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'danger' : 'warning'}>
                                            {req.status === 'pending' ? 'WAITING FOR TEACHER' : req.status === 'teacher_review' ? 'PENDING HOD APPROVAL' : req.status.toUpperCase()}
                                        </Badge>
                                        {req.document_url && (
                                            <button 
                                                onClick={() => window.open(req.document_url, '_blank')}
                                                className="text-[10px] font-black text-indigo-600 uppercase hover:underline"
                                            >
                                                View Evidence
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="panel p-6 bg-slate-900 text-white border-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="h-20 w-20" />
                        </div>
                        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
                             <AlertCircle className="h-4 w-4 text-indigo-400" />
                             Rule Engine
                        </h4>
                        <ul className="space-y-3">
                             {[
                                 'Valid document (PDF/Image) required.',
                                 'Maximum 15% condonation allowed.',
                                 'Approval sequence: Teacher → HOD.',
                                 'Requires 24h processing window.'
                             ].map((rule, i) => (
                                 <li key={i} className="flex items-start gap-2 text-xs text-slate-400 leading-tight">
                                     <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                     {rule}
                                 </li>
                             ))}
                        </ul>
                    </div>

                    <div className="panel p-6 border-slate-200">
                         <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <h4 className="font-bold text-slate-800 text-sm">Policy Update</h4>
                         </div>
                         <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            Starting Semester 1, 2026, medical certificates must contain the Medical Registration Number (MRN) for verification.
                         </p>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Attendance Condonation Application">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Subject affected</label>
                            <select 
                                className="w-full text-sm font-medium p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600"
                                value={form.subject_id}
                                onChange={e => setForm({...form, subject_id: e.target.value})}
                                required
                            >
                                <option value="">Select subject...</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                            </select>
                        </div>

                        <Input 
                            label="Number of Lectures to Condone" 
                            type="number" 
                            placeholder="e.g. 8"
                            value={form.lectures}
                            onChange={e => setForm({...form, lectures: e.target.value})}
                            required
                        />

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Reason for Absence</label>
                            <textarea 
                                className="w-full h-24 p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                                placeholder="Details of medical emergency or event..."
                                value={form.reason}
                                onChange={e => setForm({...form, reason: e.target.value})}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Supporting Evidence (Upload PDF/Image)</label>
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" className="h-10 relative overflow-hidden">
                                     <Upload className="h-4 w-4 mr-2" />
                                     {form.file ? form.file.name.substring(0, 20) : 'Choose File'}
                                     <input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={e => setForm({...form, file: e.target.files[0]})}
                                     />
                                </Button>
                                {form.file && <span className="text-[10px] text-green-600 font-bold uppercase">Ready to sync</span>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2 text-sm">
                        <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting}>
                            {submitting ? 'Submitting...' : 'Submit to Faculty'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

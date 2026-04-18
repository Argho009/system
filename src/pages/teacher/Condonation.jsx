import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { toast } from '../../components/ui/Toast';
import { 
  FileCheck, ShieldAlert, Search, 
  Upload, CheckCircle, XCircle, 
  Clock, FileText 
} from 'lucide-react';

export const TeacherCondonation = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    
    // New Request Form
    const [form, setForm] = useState({ 
        student_roll: '', 
        subject_id: '', 
        lectures: '', 
        reason: '', 
        file: null 
    });
    const [assignments, setAssignments] = useState([]);
    const [resolvedStudent, setResolvedStudent] = useState(null);

    useEffect(() => {
        fetchRequests();
        fetchAssignments();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        // Requests related to subjects this teacher handles
        const { data: myAssigned } = await supabase.from('subject_assignments').select('subject_id').eq('teacher_id', user.id);
        const subjectIds = myAssigned?.map(a => a.subject_id) || [];

        const { data } = await supabase.from('attendance_condonation')
            .select('*, student:students(roll_no, users(name)), subject:subjects(code, name)')
            .in('subject_id', subjectIds)
            .order('created_at', { ascending: false });
        
        if (data) setRequests(data);
        setLoading(false);
    };

    const fetchAssignments = async () => {
        const { data } = await supabase.from('subject_assignments')
            .select('subject_id, subjects(id, code, name)')
            .eq('teacher_id', user.id);
        if (data) setAssignments(data);
    };

    const resolveStudent = async () => {
        if (!form.student_roll) return;
        const { data } = await supabase.from('students')
            .select('id, users(name)')
            .eq('roll_no', form.student_roll.trim().toUpperCase())
            .single();
        if (data) setResolvedStudent(data);
        else {
            setResolvedStudent(null);
            toast.error('Student not found');
        }
    };

    const handleAction = async (id, status) => {
        const { error } = await supabase.from('attendance_condonation')
            .update({ status: status === 'approve' ? 'teacher_review' : 'rejected' })
            .eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success(status === 'approve' ? 'Verification sent to HOD' : 'Request rejected');
            fetchRequests();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!resolvedStudent || !form.subject_id || !form.lectures) return;

        setSubmitting(true);
        try {
            let docUrl = null;
            if (form.file) {
                const fileName = `${Date.now()}-${form.file.name}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('condonation_docs')
                    .upload(fileName, form.file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('condonation_docs').getPublicUrl(fileName);
                docUrl = publicUrl;
            }

            const { error } = await supabase.from('attendance_condonation').insert({
                student_id: resolvedStudent.id,
                subject_id: form.subject_id,
                lectures_condoned: parseInt(form.lectures),
                reason: form.reason,
                document_url: docUrl,
                status: 'teacher_review',
                requested_by: user.id
            });

            if (error) throw error;
            toast.success('Condonation initiated and sent to HOD');
            setIsModalOpen(false);
            setForm({ student_roll: '', subject_id: '', lectures: '', reason: '', file: null });
            fetchRequests();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        { 
            header: 'Student', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.student?.users?.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{row.student?.roll_no}</span>
                </div>
            )
        },
        { 
            header: 'Subject', 
            render: (row) => <Badge variant="slate">{row.subject?.code}</Badge> 
        },
        { header: 'Lectures', accessor: 'lectures_condoned' },
        { 
            header: 'Status', 
            render: (row) => (
                <Badge variant={row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'}>
                    {row.status.toUpperCase().replace('_', ' ')}
                </Badge>
            )
        },
        {
            header: 'Actions',
            render: (row) => (
                <div className="flex items-center gap-2">
                    {row.status === 'pending' && (
                        <>
                            <Button size="sm" onClick={() => handleAction(row.id, 'approve')} className="bg-green-600 hover:bg-green-700 h-8 px-2">
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => handleAction(row.id, 'reject')} className="h-8 px-2">
                                <XCircle className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                    {row.document_url && (
                        <Button variant="ghost" size="sm" onClick={() => window.open(row.document_url, '_blank')} className="h-8 px-2 text-indigo-600">
                            <FileText className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <ShieldAlert className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Academic Exceptions</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Condonation Review</h2>
                  <p className="text-sm text-slate-500 font-medium">Verify absence justifications and medical exemptions.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Initiate Request
                </Button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-indigo-600" />
                        Active Requests
                    </h3>
                    <div className="flex items-center gap-2">
                        <Badge variant="warning">{requests.filter(r => r.status === 'pending').length} Action Required</Badge>
                    </div>
                </div>
                <Table columns={columns} data={requests} loading={loading} emptyMessage="No condonation requests found." />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initiate Condonation">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <Input 
                                    label="Student Roll No" 
                                    placeholder="e.g. 2024CS101" 
                                    value={form.student_roll}
                                    onChange={e => setForm({...form, student_roll: e.target.value})}
                                    required
                                />
                            </div>
                            <Button type="button" variant="outline" onClick={resolveStudent} className="h-10">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                        {resolvedStudent && (
                            <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-bold text-green-700">Student: {resolvedStudent.users?.name}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Subject Context</label>
                                <select 
                                    className="w-full text-sm font-medium p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600"
                                    value={form.subject_id}
                                    onChange={e => setForm({...form, subject_id: e.target.value})}
                                    required
                                >
                                    <option value="">Select subject...</option>
                                    {assignments.map(a => <option key={a.subject_id} value={a.subject_id}>{a.subjects?.code} - {a.subjects?.name}</option>)}
                                </select>
                            </div>
                            <Input 
                                label="Lectures to Condone" 
                                type="number" 
                                placeholder="e.g. 5"
                                value={form.lectures}
                                onChange={e => setForm({...form, lectures: e.target.value})}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Reason / Remarks</label>
                            <textarea 
                                className="w-full h-24 p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
                                placeholder="Medical leave verified by clinic..."
                                value={form.reason}
                                onChange={e => setForm({...form, reason: e.target.value})}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Supporting Evidence (PDF/Image)</label>
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" className="h-10 relative overflow-hidden group">
                                    <Upload className="h-4 w-4 mr-2" />
                                    {form.file ? form.file.name.substring(0, 15) : 'Select Document'}
                                    <input 
                                        type="file" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={e => setForm({...form, file: e.target.files[0]})}
                                    />
                                </Button>
                                {form.file && <span className="text-[10px] text-slate-400 font-bold uppercase">Ready</span>}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting || !resolvedStudent}>
                            {submitting ? 'Processing...' : 'Send for HOD Review'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const PlusIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
);

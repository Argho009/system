import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { 
  FileSearch, Calendar, BookOpen, 
  Search, Download, History, 
  Filter, UserCircle 
} from 'lucide-react';

export const TeacherHistory = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [filters, setFilters] = useState({ 
        subject_id: '', 
        student_roll: '', 
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        const { data } = await supabase.from('subject_assignments')
            .select('subject_id, subjects(id, code, name)')
            .eq('teacher_id', user.id);
        if (data) {
            setAssignments(data);
            if (data.length > 0) setFilters(f => ({ ...f, subject_id: data[0].subject_id }));
        }
    };

    const runSearch = async () => {
        setLoading(true);
        try {
            let query = supabase.from('attendance')
                .select(`
                    *,
                    students(roll_no, users(name)),
                    lectures!inner(date, lecture_no, subjects(code, name)),
                    editor:users!attendance_edited_by_fkey(name)
                `)
                .gte('lectures.date', filters.startDate)
                .lte('lectures.date', filters.endDate);

            if (filters.subject_id) {
                query = query.eq('lectures.subject_id', filters.subject_id);
            }
            
            if (filters.student_roll) {
                query = query.eq('students.roll_no', filters.student_roll.trim().toUpperCase());
            }

            const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
            
            if (error) throw error;
            setLogs(data || []);
            if (data?.length === 0) toast.info('No records found for this period.');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { 
            header: 'Date / Slot', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs">
                        {new Date(row.lectures?.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Lec #{row.lectures?.lecture_no}</span>
                </div>
            )
        },
        { 
            header: 'Subject', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-indigo-600 text-[11px]">{row.lectures?.subjects?.code}</span>
                    <span className="text-[9px] text-slate-400 truncate max-w-[100px]">{row.lectures?.subjects?.name}</span>
                </div>
            )
        },
        { 
            header: 'Student Registry', 
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-700 text-xs">{row.students?.users?.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.students?.roll_no}</span>
                </div>
            )
        },
        { 
            header: 'Final State', 
            render: (row) => (
                <Badge variant={row.status === 'present' ? 'success' : 'danger'} className="text-[10px]">
                    {row.status.toUpperCase()}
                </Badge>
            )
        },
        { 
            header: 'Audit Trail', 
            render: (row) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 grayscale opacity-60">
                        <UserCircle className="h-3 w-3" />
                        <span className="text-[10px] font-medium">{row.editor?.name || 'Manual'}</span>
                    </div>
                    {row.edited_at && (
                        <span className="text-[8px] text-slate-300 font-bold">ED: {new Date(row.edited_at).toLocaleDateString()}</span>
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
                     <History className="h-4 w-4" />
                     <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Compliance & Records</span>
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Ledger</h2>
                   <p className="text-sm text-slate-500 font-medium">Full audit trail of all attendance entries and historical modifications.</p>
                </div>
                <Button variant="outline" className="bg-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            <div className="bg-white p-2 border border-slate-200 rounded-2xl shadow-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2 p-1">
                    <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
                        <BookOpen className="h-3.5 w-3.5 text-slate-400 ml-2" />
                        <select 
                            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer w-full pr-8"
                            value={filters.subject_id}
                            onChange={(e) => setFilters({ ...filters, subject_id: e.target.value })}
                        >
                            <option value="">All Subjects</option>
                            {assignments.map(a => <option key={a.subject_id} value={a.subject_id}>{a.subjects?.code} - {a.subjects?.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 min-w-[200px]">
                        <Calendar className="h-3.5 w-3.5 text-slate-400 ml-2" />
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <input 
                                type="date" 
                                className="bg-transparent border-none p-0 w-24 focus:ring-0" 
                                value={filters.startDate}
                                onChange={e => setFilters({...filters, startDate: e.target.value})}
                            />
                            <span>→</span>
                            <input 
                                type="date" 
                                className="bg-transparent border-none p-0 w-24 focus:ring-0" 
                                value={filters.endDate}
                                onChange={e => setFilters({...filters, endDate: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 w-48 relative group">
                        <Search className="h-3.5 w-3.5 text-slate-400 ml-2" />
                        <input 
                            type="text" 
                            placeholder="Student Roll..."
                            className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 w-full"
                            value={filters.student_roll}
                            onChange={e => setFilters({...filters, student_roll: e.target.value})}
                        />
                    </div>
                    <Button onClick={runSearch} className="rounded-xl px-8" disabled={loading}>
                        {loading ? 'Searching...' : 'Search Query'}
                    </Button>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <FileSearch className="h-4 w-4 text-indigo-600" />
                        Query Results
                    </h3>
                    <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{logs.length} Records Handled</span>
                    </div>
                </div>
                <Table columns={columns} data={logs} loading={loading} emptyMessage="Run a search query to view historical records." />
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex items-start gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                    <History className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                   <h4 className="text-sm font-bold text-slate-800 mb-1">Audit Protocol v2</h4>
                   <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
                       This ledger tracks all attendance modifications, including proxy removals, late-entry corrections, and HOD-approved change requests. Every row identified as "Modified" contains a cryptographically linked editor signature for accountability.
                   </p>
                </div>
            </div>
        </div>
    );
};

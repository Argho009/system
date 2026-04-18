import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { StatCard } from '../../components/ui/StatCard';
import { toast } from '../../components/ui/Toast';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';
import { 
  Users, CheckCircle, AlertTriangle, FileText, 
  Download, Search, Filter, Calendar 
} from 'lucide-react';
import { exportToExcel } from '../../utils/exportExcel';

export const HodAttendance = () => {
    const [branches, setBranches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [filters, setFilters] = useState({ 
        branch: '', 
        sem: '1', 
        subject_id: 'All', 
        date_from: '', 
        date_to: '' 
    });
    const [report, setReport] = useState([]);
    const [summary, setSummary] = useState({ totalLectures: 0, criticalStudents: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        const { data: bData } = await supabase.from('branches').select('*').order('name');
        if (bData) {
            setBranches(bData);
            if (bData.length > 0) setFilters(f => ({ ...f, branch: bData[0].name }));
        }
    };

    useEffect(() => {
        if (filters.branch && filters.sem) {
            supabase.from('subjects')
                .select('id, code, name')
                .eq('branch', filters.branch)
                .eq('sem', parseInt(filters.sem))
                .then(({ data }) => setSubjects(data || []));
        }
    }, [filters.branch, filters.sem]);

    const generateReport = async () => {
        if (!filters.branch || !filters.sem) return toast.error('Select scope first');
        setLoading(true);
        try {
            // 1. Get Academic Year
            const { data: config } = await supabase.from('system_config').select('value').eq('key', 'current_academic_year').single();
            const academicYear = config?.value || '2024-25';

            // 2. Get Students
            const { data: students } = await supabase.from('students')
                .select('id, roll_no, users(name)')
                .eq('branch', filters.branch)
                .eq('sem', parseInt(filters.sem))
                .order('roll_no');

            // 3. Get Lectures
            let lecQuery = supabase.from('lectures').select('id, subject_id').eq('sem', parseInt(filters.sem)).eq('is_skipped', false);
            if (filters.subject_id !== 'All') lecQuery = lecQuery.eq('subject_id', filters.subject_id);
            if (filters.date_from) lecQuery = lecQuery.gte('date', filters.date_from);
            if (filters.date_to) lecQuery = lecQuery.lte('date', filters.date_to);
            const { data: lectures } = await lecQuery;
            const lectureIds = (lectures || []).map(l => l.id);

            // 4. Get Attendance & Condonation
            const [attRes, condRes] = await Promise.all([
                supabase.from('attendance').select('student_id, lecture_id, status').in('lecture_id', lectureIds),
                supabase.from('attendance_condonation').select('student_id, lectures_condoned').eq('status', 'approved').eq('academic_year', academicYear)
            ]);

            const rows = (students || []).map(stu => {
                const stuAtt = (attRes.data || []).filter(a => a.student_id === stu.id);
                const present = stuAtt.filter(a => a.status === 'present').length;
                const total = lectureIds.length;
                const condoned = (condRes.data || []).filter(c => c.student_id === stu.id).reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);
                
                return {
                    ...stu,
                    name: stu.users?.name,
                    total,
                    present,
                    absent: total - present,
                    condoned,
                    raw: rawPercent(present, total),
                    final: finalPercent(present, condoned, total)
                };
            });

            setReport(rows);
            setSummary({
                totalLectures: lectureIds.length,
                criticalStudents: rows.filter(r => r.final < 75).length
            });
        } catch (err) {
            toast.error('Report generation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        if (report.length === 0) return;
        const data = report.map(r => ({
            Roll: r.roll_no,
            Name: r.name,
            Total: r.total,
            Present: r.present,
            Absent: r.absent,
            Condoned: r.condoned,
            'Raw %': r.raw,
            'Final %': r.final,
            Status: r.final >= 75 ? 'Eligible' : 'Critical'
        }));
        exportToExcel([{ name: 'Attendance', data }], `Attendance_${filters.branch}_Sem${filters.sem}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <FileText className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Oversight Dashboard</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Department Attendance</h2>
                  <p className="text-sm text-slate-500 font-medium">Global participation registry and eligibility thresholds.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport} disabled={report.length === 0}>
                        <Download className="h-4 w-4 mr-2" /> Export Excel
                    </Button>
                </div>
            </div>

            <div className="panel p-6 bg-white border-slate-200 shadow-xl shadow-slate-100/50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Branch</label>
                        <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer" value={filters.branch} onChange={e => setFilters({...filters, branch: e.target.value})}>
                            {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stage</label>
                        <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer" value={filters.sem} onChange={e => setFilters({...filters, sem: e.target.value})}>
                            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>Sem {s}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Context (Subject)</label>
                        <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer" value={filters.subject_id} onChange={e => setFilters({...filters, subject_id: e.target.value})}>
                            <option value="All">All Subjects (Global)</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date From</label>
                        <input type="date" className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" value={filters.date_from} onChange={e => setFilters({...filters, date_from: e.target.value})} />
                    </div>
                    <div className="flex items-end">
                        <Button className="w-full h-10 rounded-xl shadow-lg shadow-indigo-100" onClick={generateReport} disabled={loading}>
                           {loading ? 'Processing...' : 'Sync Registry'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Prominent Lectures Held" value={summary.totalLectures} icon={Calendar} color="indigo" />
                <StatCard title="Tracked Population" value={report.length} icon={Users} color="slate" />
                <StatCard 
                    title="Critical Eligibility" 
                    value={summary.criticalStudents} 
                    subtitle="Students below 75%" 
                    icon={AlertTriangle} 
                    color={summary.criticalStudents > 0 ? 'red' : 'green'} 
                />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-indigo-600" />
                        Cumulative Performance Index
                    </h3>
                </div>
                <Table 
                    columns={[
                        { header: 'Identity', accessor: 'roll_no', render: r => (
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-sm italic">{r.roll_no}</span>
                                <span className="text-xs text-slate-500 font-medium">{r.name}</span>
                            </div>
                        )},
                        { header: 'Registry (P/T)', accessor: 'id', render: r => (
                             <div className="flex items-center gap-1.5 font-bold text-xs">
                                <span className="text-slate-800">{r.present}</span>
                                <span className="text-slate-300">/</span>
                                <span className="text-slate-400">{r.total}</span>
                             </div>
                        )},
                        { header: 'Absent', accessor: 'absent', render: r => <span className="text-xs font-bold text-red-400">{r.absent} units</span> },
                        { header: 'Condoned', accessor: 'condoned', render: r => <Badge variant={r.condoned > 0 ? 'indigo' : 'slate'} className="text-[10px]">{r.condoned} Units</Badge> },
                        { header: 'Raw Index', accessor: 'raw', render: r => <span className="text-xs font-bold text-slate-400">{r.raw}%</span> },
                        { header: 'Final Index', accessor: 'final', render: r => <span className={`text-sm font-black ${colorForPercent(r.final)}`}>{r.final}%</span> },
                        { 
                            header: 'Status', 
                            render: r => (
                                <Badge variant={r.final >= 75 ? 'success' : r.final >= 65 ? 'warning' : 'danger'} className="px-3">
                                    {r.final >= 75 ? 'ELIGIBLE' : r.final >= 65 ? 'WARNING' : 'OUTSIDE'}
                                </Badge>
                            )
                        }
                    ]}
                    data={report}
                    emptyMessage="No registry data available for selected scope."
                />
            </div>
        </div>
    );
};

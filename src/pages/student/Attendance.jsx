import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';
import { toast } from '../../components/ui/Toast';
import { 
  TrendingUp, TrendingDown, Clock, 
  Target, GraduationCap, ChevronRight, 
  ArrowLeft, Calendar, Info 
} from 'lucide-react';

export const StudentAttendance = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [subjectData, setSubjectData] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: stu } = await supabase.from('students').select('id, roll_no, branch, sem').eq('user_id', user.id).single();
            if (!stu) return;
            setStudent(stu);

            const [subjects, lectures, attendance, condonation] = await Promise.all([
                supabase.from('subjects').select('id, code, name').eq('branch', stu.branch).eq('sem', stu.sem),
                supabase.from('lectures').select('id, subject_id, date, lecture_no').eq('sem', stu.sem).eq('is_skipped', false),
                supabase.from('attendance').select('lecture_id, status, remarks').eq('student_id', stu.id),
                supabase.from('attendance_condonation').select('subject_id, lectures_condoned').eq('student_id', stu.id).eq('status', 'approved')
            ]);

            const summary = (subjects.data || []).map(sub => {
                const subLectures = (lectures.data || []).filter(l => l.subject_id === sub.id);
                const subAtt = (attendance.data || []).filter(a => subLectures.some(l => l.id === a.lecture_id));
                const present = subAtt.filter(a => a.status === 'present').length;
                const total = subLectures.length;
                const condoned = (condonation.data || []).filter(c => c.subject_id === sub.id).reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);
                
                const raw = rawPercent(present, total);
                const final = finalPercent(present, condoned, total);
                
                // Days until 75% logic
                let daysTo75 = 0;
                if (final < 75) {
                    // (present + x) / (total + x) >= 0.75
                    // present + x >= 0.75 * total + 0.75 * x
                    // 0.25 * x >= 0.75 * total - present
                    daysTo75 = Math.ceil((0.75 * total - present) / 0.25);
                    if (daysTo75 < 0) daysTo75 = 0;
                }

                return {
                    ...sub,
                    present, total, condoned, raw, final, daysTo75,
                    lectures: subLectures.map(l => ({
                        ...l,
                        status: subAtt.find(a => a.lecture_id === l.id)?.status || 'absent',
                        remarks: subAtt.find(a => a.lecture_id === l.id)?.remarks
                    })).sort((a,b) => new Date(b.date) - new Date(a.date))
                };
            });
            setSubjectData(summary);
        } catch (err) {
            toast.error('Failed to load attendance trend');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    if (selectedSubject) {
        return (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
                <Button variant="ghost" onClick={() => setSelectedSubject(null)} className="pl-0 text-slate-500 hover:text-indigo-600">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Subjects
                </Button>

                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="indigo">{selectedSubject.code}</Badge>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest text-[10px]">Lecture History</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedSubject.name}</h2>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`text-3xl font-black ${colorForPercent(selectedSubject.final)}`}>{selectedSubject.final}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Current Performance</span>
                    </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <Table 
                        columns={[
                            { 
                                header: 'Session Date', 
                                render: (row) => (
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 text-xs">
                                            {new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                            {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                                        </span>
                                    </div>
                                )
                            },
                            { 
                                header: 'Slot', 
                                render: (row) => <Badge variant="slate" className="font-mono">Lec #{row.lecture_no}</Badge> 
                            },
                            { 
                                header: 'Record', 
                                render: (row) => (
                                    <Badge variant={row.status === 'present' ? 'success' : 'danger'} className="px-3">
                                        {row.status.toUpperCase()}
                                    </Badge>
                                )
                            },
                            { 
                                header: 'Remarks', 
                                render: (row) => <span className="text-xs text-slate-500 italic">{row.remarks || '—'}</span> 
                            }
                        ]}
                        data={selectedSubject.lectures}
                    />
                </div>
            </div>
        );
    }

    const overall = subjectData.length ? (subjectData.reduce((a, b) => a + b.final, 0) / subjectData.length).toFixed(1) : 0;
    const criticalSub = subjectData.find(s => s.final < 75);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 text-indigo-600 mb-1">
                     <TrendingUp className="h-4 w-4" />
                     <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Live Analytics</span>
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Trend</h2>
                   <p className="text-sm text-slate-500 font-medium">Real-time tracking of your academic eligibility and participation.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Overall Eligibility" 
                    value={`${overall}%`} 
                    icon={GraduationCap} 
                    color={parseFloat(overall) >= 75 ? 'green' : 'red'} 
                />
                <StatCard 
                    title="Critical Action" 
                    value={criticalSub ? criticalSub.code : 'All Clear'} 
                    subtitle={criticalSub ? `Below 75% threshold` : 'Eligibility maintained'}
                    icon={Target} 
                    color={criticalSub ? 'amber' : 'indigo'} 
                />
                <StatCard 
                    title="Days until 75%" 
                    value={criticalSub ? criticalSub.daysTo75 : '0'} 
                    subtitle="Consecutive classes needed"
                    icon={Clock} 
                    color="slate" 
                />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                        Subject-wise Breakdown
                    </h3>
                    <div className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Click row for details</span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Course Context</th>
                                <th className="px-6 py-4">Total Participation</th>
                                <th className="px-6 py-4">Condoned</th>
                                <th className="px-6 py-4">Performance Index</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {subjectData.map((sub) => (
                                <tr 
                                    key={sub.id} 
                                    onClick={() => setSelectedSubject(sub)}
                                    className="group cursor-pointer hover:bg-slate-50 transition-colors"
                                >
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">{sub.name}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{sub.code}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700">{sub.present}</span>
                                            <span className="text-slate-300">/</span>
                                            <span className="text-slate-400 text-xs font-semibold">{sub.total} sessions</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <Badge variant={sub.condoned > 0 ? 'indigo' : 'slate'} className="text-[9px]">
                                            {sub.condoned} Units
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${sub.final >= 75 ? 'bg-green-500' : sub.final >= 65 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                                    style={{ width: `${Math.min(sub.final, 100)}%` }}
                                                />
                                            </div>
                                            <span className={`font-black text-sm ${colorForPercent(sub.final)}`}>{sub.final}%</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 group-hover:text-indigo-600 transition-all" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {criticalSub && (
                <div className="p-6 bg-red-50 border border-red-100 rounded-3xl flex items-center gap-6 animate-pulse">
                    <div className="p-3 bg-red-100 rounded-2xl">
                        <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-red-900 text-sm">Condonation Threshold Reached</h4>
                        <p className="text-xs text-red-700 mt-1 max-w-2xl leading-relaxed">
                            Your attendance in <strong>{criticalSub.name} ({criticalSub.code})</strong> has fallen below the 75% mandatory threshold. You are required to attend the next {criticalSub.daysTo75} consecutive lectures to regain eligibility, or apply for condonation.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

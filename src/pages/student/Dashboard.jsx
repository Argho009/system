import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { rawPercent, finalPercent, colorForPercent } from '../../utils/attendanceCalc';
import { Bell, BookOpen, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

export const StudentDashboard = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [subjectSummary, setSubjectSummary] = useState([]);
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    async function fetchData() {
        setLoading(true);
        const { data: stu } = await supabase.from('students').select('id, roll_no, branch, sem, users(name)').eq('user_id', user.id).single();
        if (!stu) { setLoading(false); return; }
        setStudent(stu);

        const { data: configRes } = await supabase.from('system_config').select('value').eq('key', 'current_academic_year').single();
        const year = configRes?.value || '2024-25';

        const { data: subjects } = await supabase.from('subjects').select('id, code, name').eq('branch', stu.branch).eq('sem', stu.sem);

        if (subjects?.length) {
            const [lectures, attendance, condonation] = await Promise.all([
                supabase.from('lectures').select('id, subject_id').eq('sem', stu.sem).eq('is_skipped', false),
                supabase.from('attendance').select('lecture_id, status, lectures(subject_id)').eq('student_id', stu.id).eq('academic_year', year),
                supabase.from('attendance_condonation').select('subject_id, lectures_condoned').eq('student_id', stu.id).eq('status', 'approved')
            ]);

            const summary = subjects.map(sub => {
                const subLectures = (lectures.data || []).filter(l => l.subject_id === sub.id);
                const subAttendance = (attendance.data || []).filter(a => (lectures.data || []).some(l => l.id === a.lecture_id && l.subject_id === sub.id));
                const present = subAttendance.filter(a => a.status === 'present').length;
                const total = subLectures.length;
                const condoned = (condonation.data || []).filter(c => c.subject_id === sub.id).reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);
                
                return {
                    ...sub,
                    present, total, condoned,
                    raw: rawPercent(present, total),
                    final: finalPercent(present, condoned, total)
                };
            });
            setSubjectSummary(summary);
        }

        const { data: noticesData } = await supabase.from('notices').select('*').eq('is_active', true).or(`branch.eq.${stu.branch},branch.is.null`).eq('sem', stu.sem).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3);
        setNotices(noticesData || []);
        setLoading(false);
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    const overallFinal = subjectSummary.length ? (subjectSummary.reduce((a, b) => a + b.final, 0) / subjectSummary.length) : 0;
    const overallRaw = subjectSummary.length ? (subjectSummary.reduce((a, b) => a + b.raw, 0) / subjectSummary.length) : 0;
    const criticalSub = subjectSummary.find(s => s.final < 75);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {criticalSub && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4 animate-pulse shadow-sm">
                    <div className="p-2 bg-red-100 rounded-xl text-red-600">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-red-900 text-sm">Attendance Alert</h4>
                        <p className="text-xs text-red-700 font-medium">Your final attendance in <strong>{criticalSub.name}</strong> is below the 75% threshold. Take corrective action.</p>
                    </div>
                </div>
            )}

            <div className="flex items-end justify-between">
                <div>
                   <h2 className="text-3xl font-bold text-slate-900 tracking-tight">System Terminal</h2>
                   <p className="text-sm text-slate-500 font-medium">Authorized session for {student?.users?.name} ({student?.roll_no})</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="indigo" className="h-7 px-3 flex items-center gap-1.5 uppercase font-bold tracking-widest text-[10px]">
                        <Calendar className="h-3 w-3" />
                         Semester {student?.sem}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="panel p-6 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-100 flex flex-col justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">AGGREGATE ELIGIBILITY</p>
                        <h3 className="text-4xl font-black">{overallFinal.toFixed(1)}%</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">RAW PARTICIPATION</span>
                        <span className="text-xs font-black">{overallRaw.toFixed(1)}%</span>
                    </div>
                </div>
                <StatCard title="Active Subjects" value={subjectSummary.length} icon={BookOpen} color="slate" />
                <StatCard title="Participation Status" value={overallFinal >= 75 ? 'ELIGIBLE' : 'CRITICAL'} icon={TrendingUp} color={overallFinal >= 75 ? 'green' : 'red'} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                       <TrendingUp className="h-4 w-4" />
                       Subject-wise Status
                    </h3>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Subject</th>
                                    <th className="px-6 py-4 text-center">Sessions</th>
                                    <th className="px-6 py-4">Status (Raw | Final)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {subjectSummary.map(s => (
                                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{s.code}</p>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="font-bold text-slate-700 text-sm">{s.present}</span>
                                            <span className="text-slate-300 mx-1">/</span>
                                            <span className="text-slate-400 text-xs font-semibold">{s.total}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-400">{s.raw}%</span>
                                                <div className="h-4 w-px bg-slate-200" />
                                                <span className={`text-sm font-black ${colorForPercent(s.final)}`}>{s.final}%</span>
                                            </div>
                                            {s.condoned > 0 && <p className="text-[9px] font-bold text-indigo-500 mt-1 uppercase">+{s.condoned} condoned</p>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                       <Bell className="h-4 w-4" />
                       Communications
                    </h3>
                    <div className="space-y-3">
                        {notices.length > 0 ? notices.map(n => (
                            <div key={n.id} className="panel p-5 bg-white border-slate-200 shadow-xl shadow-slate-100/50 group hover:border-indigo-300 transition-all">
                                <div className="flex items-start justify-between mb-3">
                                    <Badge variant="indigo" className="text-[9px] font-bold uppercase tracking-wider">{n.type}</Badge>
                                    {n.is_pinned && <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />}
                                </div>
                                <h4 className="font-bold text-slate-900 text-sm mb-1 group-hover:text-indigo-600 transition-colors uppercase leading-tight line-clamp-1">{n.title}</h4>
                                <p className="text-xs text-slate-500 font-medium line-clamp-2">{n.body}</p>
                                {n.due_date && (
                                    <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px] font-bold">
                                        <span className="text-slate-400 uppercase tracking-widest">SUBMISSION DEADLINE</span>
                                        <span className="text-red-500">{new Date(n.due_date).toLocaleDateString('en-IN')}</span>
                                    </div>
                                )}
                            </div>
                        )) : (
                            <div className="panel p-8 text-center text-slate-400 bg-slate-50 border-dashed border-2">
                                No active advisories.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

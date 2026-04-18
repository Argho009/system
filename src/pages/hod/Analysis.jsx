import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { 
  BarChart3, TrendingDown, TrendingUp, Filter, 
  Download, BookOpen, GraduationCap, ChevronRight 
} from 'lucide-react';

export const HodAnalysis = () => {
    const [branches, setBranches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [filter, setFilter] = useState({ branch: '', sem: '', subject_id: '' });
    const [marksData, setMarksData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ average: 0, highest: 0, lowest: 0, passing: 0 });

    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from('branches').select('*').order('name');
            if (data) {
                setBranches(data);
                if (data.length > 0) setFilter(f => ({ ...f, branch: data[0].name, sem: '1' }));
            }
        };
        fetchBranches();
    }, []);

    useEffect(() => {
        if (filter.branch && filter.sem) {
            const fetchSubjects = async () => {
                const { data } = await supabase.from('subjects')
                    .select('id, name, code')
                    .eq('branch', filter.branch)
                    .eq('sem', parseInt(filter.sem));
                if (data) {
                    setSubjects(data);
                    if (data.length > 0) setFilter(f => ({ ...f, subject_id: data[0].id }));
                }
            };
            fetchSubjects();
        }
    }, [filter.branch, filter.sem]);

    const runAnalysis = async () => {
        if (!filter.subject_id) return;
        setLoading(true);
        try {
            const { data: marks } = await supabase.from('ct_marks')
                .select('*, students(roll_no, users(name))')
                .eq('subject_id', filter.subject_id);
            
            if (marks) {
                // Group by student
                const studentMap = {};
                marks.forEach(m => {
                    if (!studentMap[m.student_id]) {
                        studentMap[m.student_id] = {
                            name: m.students?.users?.name || 'Unknown',
                            roll_no: m.students?.roll_no || '—',
                            tests: {},
                            sum: 0,
                            count: 0
                        };
                    }
                    studentMap[m.student_id].tests[m.test_name] = m.marks_obtained;
                    studentMap[m.student_id].sum += m.marks_obtained;
                    studentMap[m.student_id].count++;
                });

                const processed = Object.values(studentMap).map(s => ({
                    ...s,
                    average: (s.sum / s.count).toFixed(2)
                }));

                setMarksData(processed);

                // Compute overall stats
                const allAverages = processed.map(p => parseFloat(p.average));
                setStats({
                    average: (allAverages.reduce((a, b) => a + b, 0) / (allAverages.length || 1)).toFixed(2),
                    highest: Math.max(...allAverages, 0),
                    lowest: Math.min(...allAverages, 0),
                    passing: processed.filter(p => p.average >= 40).length // Assuming 40 is pass
                });
            }
        } catch (err) {
            toast.error('Analysis failed');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'Roll No', accessor: 'roll_no' },
        { header: 'Student Name', accessor: 'name' },
        { 
            header: 'CT-1', 
            render: (row) => row.tests['CT1'] ?? <span className="text-red-400">N/A</span> 
        },
        { 
            header: 'CT-2', 
            render: (row) => row.tests['CT2'] ?? <span className="text-red-400">N/A</span> 
        },
        { 
            header: 'Avg. Score', 
            accessor: 'average',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${parseFloat(row.average) >= 75 ? 'bg-green-500' : parseFloat(row.average) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${Math.min(parseFloat(row.average), 100)}%` }}
                        />
                    </div>
                    <span className="font-bold text-slate-800">{row.average}</span>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 text-indigo-600 mb-1">
                     <BarChart3 className="h-4 w-4" />
                     <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Data Analytics</span>
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Performance Intelligence</h2>
                   <p className="text-sm text-slate-500 font-medium">Cross-reference assessment scores with attendance trends.</p>
                </div>
                <Button variant="outline" className="bg-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export Analysis
                </Button>
            </div>

            <div className="bg-white p-2 border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex-1 min-w-[150px]">
                    <select 
                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer w-full"
                        value={filter.branch}
                        onChange={(e) => setFilter({ ...filter, branch: e.target.value })}
                    >
                        {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 w-32">
                    <select 
                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer w-full"
                        value={filter.sem}
                        onChange={(e) => setFilter({ ...filter, sem: e.target.value })}
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s.toString()}>SEM {s}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex-2 min-w-[200px]">
                    <select 
                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer w-full"
                        value={filter.subject_id}
                        onChange={(e) => setFilter({ ...filter, subject_id: e.target.value })}
                    >
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                    </select>
                </div>
                <Button onClick={runAnalysis} className="rounded-xl px-8" disabled={loading}>
                    Generate Insight
                </Button>
            </div>

            {marksData.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard title="Class Average" value={`${stats.average}%`} icon={BookOpen} color="indigo" />
                        <StatCard title="Highest Score" value={`${stats.highest}%`} icon={TrendingUp} color="green" />
                        <StatCard title="Lowest Score" value={`${stats.lowest}%`} icon={TrendingDown} color="red" />
                        <StatCard title="Passing Students" value={stats.passing} icon={GraduationCap} color="slate" />
                    </div>

                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-400" />
                                Assessment Breakdown
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-400 tracking-tighter">
                                <span>Subject: {subjects.find(s => s.id === filter.subject_id)?.code}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span className="text-indigo-600">{marksData.length} records</span>
                            </div>
                        </div>
                        <Table columns={columns} data={marksData} />
                    </div>
                </>
            )}

            {!marksData.length && !loading && (
                <div className="panel h-64 flex flex-col items-center justify-center border-dashed border-2 border-slate-200 bg-slate-50/50 text-slate-400">
                    <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-bold text-slate-900">No Assessment Data</p>
                    <p className="text-xs font-medium mt-1">Select a subject and generate insights to view performance metrics.</p>
                </div>
            )}
        </div>
    );
};

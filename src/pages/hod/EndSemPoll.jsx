import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { toast } from '../../components/ui/Toast';
import { 
  BarChart3, MessageSquare, Star, 
  ChevronRight, ArrowLeft, BookOpen, 
  Users, Activity 
} from 'lucide-react';

export const HodEndSemPoll = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [comments, setComments] = useState([]);

    useEffect(() => {
        fetchPollStats();
    }, []);

    const fetchPollStats = async () => {
        setLoading(true);
        try {
            const { data: pollData } = await supabase
                .from('endsem_poll')
                .select('*, subjects(code, name, branch, sem)');
            
            if (pollData) {
                const subjectGroup = {};
                pollData.forEach(p => {
                    const sid = p.subject_id;
                    if (!subjectGroup[sid]) {
                        subjectGroup[sid] = {
                            id: sid,
                            code: p.subjects?.code,
                            name: p.subjects?.name,
                            branch: p.subjects?.branch,
                            sem: p.subjects?.sem,
                            totalRating: 0,
                            count: 0,
                            comments: []
                        };
                    }
                    subjectGroup[sid].totalRating += p.rating;
                    subjectGroup[sid].count++;
                    if (p.comments) subjectGroup[sid].comments.push({
                        text: p.comments,
                        rating: p.rating,
                        date: p.submitted_at
                    });
                });

                const processed = Object.values(subjectGroup).map(s => ({
                    ...s,
                    avgRating: (s.totalRating / s.count).toFixed(1)
                }));
                setStats(processed);
            }
        } catch (err) {
            toast.error('Failed to load poll data');
        } finally {
            setLoading(false);
        }
    };

    const handleViewComments = (subject) => {
        setSelectedSubject(subject);
        setComments(subject.comments);
    };

    if (selectedSubject) {
        return (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
                <Button variant="ghost" onClick={() => setSelectedSubject(null)} className="pl-0">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Overview
                </Button>

                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="indigo">{selectedSubject.code}</Badge>
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">Feedback Stream</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">{selectedSubject.name}</h2>
                    </div>
                    <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-xl border border-amber-100">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <span className="text-2xl font-black text-amber-600">{selectedSubject.avgRating}</span>
                        <span className="text-slate-400 font-bold text-xs uppercase ml-1">Avg Score</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {comments.length === 0 ? (
                        <div className="panel p-12 text-center text-slate-400">No comments submitted for this subject.</div>
                    ) : comments.map((c, i) => (
                        <div key={i} className="panel p-6 bg-white border-slate-200 hover:border-indigo-200 transition-colors shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, idx) => (
                                        <Star key={idx} className={`h-3 w-3 ${idx < c.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed italic">"{c.text}"</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const columns = [
        { 
            header: 'Subject Code', 
            accessor: 'code',
            render: (row) => <span className="font-bold text-indigo-600">{row.code}</span>
        },
        { 
            header: 'Subject Name', 
            accessor: 'name',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{row.name}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{row.branch} • SEM {row.sem}</span>
                </div>
            )
        },
        { 
            header: 'Participation', 
            accessor: 'count',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-600">{row.count} Votes</span>
                </div>
            )
        },
        { 
            header: 'Subject Rating', 
            accessor: 'avgRating',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${parseFloat(row.avgRating) >= 4 ? 'bg-green-500' : parseFloat(row.avgRating) >= 3 ? 'bg-amber-500' : 'bg-red-500'}`} 
                            style={{ width: `${(parseFloat(row.avgRating) / 5) * 100}%` }}
                        />
                    </div>
                    <span className="font-black text-slate-900 text-sm">{row.avgRating}</span>
                </div>
            )
        },
        {
            header: 'Feedback',
            accessor: 'id',
            render: (row) => (
                <Button variant="ghost" size="sm" onClick={() => handleViewComments(row)} className="group text-indigo-600">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Read Comments
                    <ChevronRight className="h-3.5 w-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 text-indigo-600 mb-1">
                     <Activity className="h-4 w-4" />
                     <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Academic Quality Assurance</span>
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900 tracking-tight">End-Semester Feedback</h2>
                   <p className="text-sm text-slate-500 font-medium">Metric analysis of student satisfaction and faculty performance ratings.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Star className="h-4 w-4 text-indigo-600" />
                        Satisfaction Scores
                    </h3>
                    <Badge variant="indigo" className="text-[10px] uppercase font-bold tracking-tighter">
                        Active Semester Polls
                    </Badge>
                </div>
                <Table columns={columns} data={stats} loading={loading} emptyMessage="No poll results found for this department." />
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl text-white flex items-center gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Star className="h-32 w-32" />
                </div>
                <div className="p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                    <BookOpen className="h-8 w-8 text-indigo-400" />
                </div>
                <div>
                    <h4 className="text-lg font-bold mb-1">Quality Assurance Protocol</h4>
                    <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                        End-semester polls are anonymous and intended to provide constructive feedback to the department. HODs should review low-rated subjects to identify areas for faculty development or resource improvement.
                    </p>
                </div>
            </div>
        </div>
    );
};

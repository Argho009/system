import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { 
  Star, MessageSquare, ShieldCheck, 
  Send, Lock, ChevronRight, 
  BookOpen, Activity 
} from 'lucide-react';

export const StudentEndSem = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [polls, setPolls] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState({});

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
                // Get subjects and existing poll entries
                const [subRes, pollRes] = await Promise.all([
                    supabase.from('subjects').select('id, code, name').eq('branch', stu.branch).eq('sem', stu.sem),
                    supabase.from('endsem_poll').select('*').eq('student_id', stu.id)
                ]);

                setSubjects(subRes.data || []);
                const pollMap = {};
                pollRes.data?.forEach(p => pollMap[p.subject_id] = p);
                setPolls(pollMap);
            }
        } catch (err) {
            toast.error('Context load failed');
        } finally {
            setLoading(false);
        }
    };

    const handleRating = (subId, rating) => {
        if (polls[subId]?.id) return; // Already submitted
        setPolls(prev => ({
            ...prev,
            [subId]: { ...prev[subId], rating }
        }));
    };

    const handleComment = (subId, comments) => {
        if (polls[subId]?.id) return;
        setPolls(prev => ({
            ...prev,
            [subId]: { ...prev[subId], comments }
        }));
    };

    const submitPoll = async (subId) => {
        const poll = polls[subId];
        if (!poll?.rating) return toast.error('Please select a rating');

        setSubmitting(prev => ({ ...prev, [subId]: true }));
        try {
            const { error } = await supabase.from('endsem_poll').insert({
                subject_id: subId,
                student_id: student.id,
                rating: poll.rating,
                comments: poll.comments || '',
                submitted_at: new Date().toISOString()
            });

            if (error) throw error;
            toast.success('Feedback recorded anonymously');
            fetchData();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSubmitting(prev => ({ ...prev, [subId]: false }));
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                   <div className="flex items-center gap-2 text-indigo-600 mb-1">
                     <Activity className="h-4 w-4" />
                     <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Quality Feedback Loop</span>
                   </div>
                   <h2 className="text-3xl font-bold text-slate-900 tracking-tight">End-Semester Feedback</h2>
                   <p className="text-sm text-slate-500 font-medium">Your anonymous reviews help improve teaching quality and resource allocation.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    {subjects.map((sub) => {
                        const isSubmitted = !!polls[sub.id]?.id;
                        const poll = polls[sub.id] || { rating: 0, comments: '' };

                        return (
                            <div key={sub.id} className={`panel p-6 bg-white border-slate-200 shadow-sm relative overflow-hidden transition-all ${isSubmitted ? 'opacity-70 grayscale-[0.5]' : 'hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50'}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <div className="space-y-1">
                                        <Badge variant="indigo" className="font-mono">{sub.code}</Badge>
                                        <h3 className="text-lg font-bold text-slate-900">{sub.name}</h3>
                                    </div>
                                    {isSubmitted && (
                                        <div className="flex items-center gap-2 text-green-600 font-bold text-[10px] uppercase bg-green-50 px-3 py-1 rounded-full border border-green-100 animate-in zoom-in duration-300">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            Record Sealed
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-6">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Efficiency Rating</p>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        disabled={isSubmitted}
                                                        onClick={() => handleRating(sub.id, star)}
                                                        className={`p-1 transition-all ${isSubmitted ? 'cursor-default' : 'hover:scale-125 focus:outline-none'}`}
                                                    >
                                                        <Star 
                                                            className={`h-6 w-6 ${star <= poll.rating ? 'text-amber-400 fill-amber-400 ripple' : 'text-slate-200'}`} 
                                                            strokeWidth={1.5}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="h-10 w-px bg-slate-100" />
                                        <div className="flex-1 space-y-2 text-right">
                                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Status</p>
                                            <p className={`text-xs font-bold ${isSubmitted ? 'text-green-600' : 'text-amber-500'}`}>
                                                {isSubmitted ? 'Participation Complete' : 'Feedback Required'}
                                            </p>
                                        </div>
                                    </div>

                                    {!isSubmitted && (
                                        <div className="space-y-3 animate-in fade-in duration-500">
                                            <textarea 
                                                className="w-full h-24 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600 resize-none font-medium placeholder:text-slate-300"
                                                placeholder="Briefly share your thoughts on the course structure or delivery..."
                                                value={poll.comments}
                                                onChange={e => handleComment(sub.id, e.target.value)}
                                            />
                                            <div className="flex justify-end">
                                                <Button 
                                                    onClick={() => submitPoll(sub.id)} 
                                                    disabled={submitting[sub.id] || !poll.rating}
                                                    className="h-10 px-6 rounded-xl shadow-lg shadow-indigo-100"
                                                >
                                                    {submitting[sub.id] ? 'Sealing...' : 'Submit Review'}
                                                    <Send className="h-3.5 w-3.5 ml-2" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {isSubmitted && poll.comments && (
                                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl italic text-slate-500 text-xs">
                                            "{poll.comments}"
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <div className="panel p-6 bg-slate-900 text-white border-none relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
                            <Lock className="h-20 w-20" />
                        </div>
                        <h4 className="text-sm font-bold mb-4 flex items-center gap-2 text-indigo-400">
                            <MessageSquare className="h-4 w-4" />
                            Anonymity Clause
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">
                            All feedback submitted through this portal is cryptographically anonymized. HODs and Teachers view aggregate ratings and raw comments without any linkage to your student ID or roll number.
                        </p>
                        <hr className="my-6 border-slate-800" />
                        <div className="space-y-3">
                             {['Subject Content', 'Faculty Pedagogy', 'Lab Resources', 'Assessment Fairness'].map((item, i) => (
                                 <div key={i} className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                     <span>{item}</span>
                                     <ChevronRight className="h-3 w-3" />
                                 </div>
                             ))}
                        </div>
                    </div>

                    <div className="panel p-6 border-slate-200 bg-white">
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Poll Statistics</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Total Subjects</span>
                                <span className="text-sm font-black text-slate-900">{subjects.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Polls Sealed</span>
                                <span className="text-sm font-black text-indigo-600">{Object.keys(polls).length}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-indigo-600 transition-all duration-1000" 
                                    style={{ width: `${(Object.keys(polls).length / (subjects.length || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

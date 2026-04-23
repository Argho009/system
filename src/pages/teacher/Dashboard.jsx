import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { BookOpen, Calendar, ShieldCheck, Check, X, AlertCircle } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const TeacherDashboard = () => {
  const { user } = useAuth();
  const [todaySlots, setTodaySlots] = useState([]);
  const [pendingProxies, setPendingProxies] = useState([]);
  const [stats, setStats] = useState({ totalLectures: 0, thisWeek: 0, pendingLeaves: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = DAYS[new Date().getDay()];
      const todayDate = new Date().toISOString().split('T')[0];
      const assignments = await api.getSubjectAssignments({ teacher_id: user.id });
      const subjectIds = (assignments || []).map((a) => a.subject_id);

      let tt = [];
      let markedToday = [];
      if (subjectIds.length) {
        const [ttRes, markedRes] = await Promise.all([
           api.getTimetable({
             subject_ids: subjectIds.join(','),
             day_of_week: today,
           }),
           api.getLectures({ teacher_id: user.id, date: todayDate, is_skipped: 'false' })
        ]);
        tt = (Array.isArray(ttRes) ? ttRes : []).sort((a, b) => a.lecture_no - b.lecture_no);
        markedToday = Array.isArray(markedRes) ? markedRes : [];
      }
      setTodaySlots(tt.map(slot => ({
         ...slot,
         isMarked: markedToday.some(m => m.subject_id === slot.subject_id && m.lecture_no === slot.lecture_no)
      })));

      const weekAgo = new Date();
      weekAgo.setHours(0, 0, 0, 0);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekDate = weekAgo.toISOString().split('T')[0];

      const [totalRes, weekRes, leaveRes, proxyRes] = await Promise.all([
        api.getLecturesCount({ teacher_id: user.id }),
        api.getLecturesCount({ teacher_id: user.id, gte_date: weekDate }),
        api.getLeaveRequestsCount({ teacher_id: user.id, status: 'pending' }),
        api.getPendingProxyLectures(),
      ]);

      setStats({
        totalLectures: totalRes?.count || 0,
        thisWeek: weekRes?.count || 0,
        pendingLeaves: leaveRes?.count || 0,
      });
      setPendingProxies(proxyRes || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleApproveProxy = async (id) => {
     try {
        await api.approveLecture(id);
        toast.success("Attendance verified!");
        fetchData();
     } catch (err) {
        toast.error("Failed to approve");
     }
  };

  const handleRejectProxy = async (id) => {
     if (!confirm("Are you sure you want to REJECT this attendance? It will be permanently deleted.")) return;
     try {
        await api.rejectLecture(id);
        toast.info("Attendance rejected and removed.");
        fetchData();
     } catch (err) {
        toast.error("Failed to reject");
     }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Teacher <span className="text-indigo-600">Station</span></h2>
          <p className="text-sm text-slate-500 font-medium">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
           <Badge variant={stats.pendingLeaves > 0 ? 'warning' : 'slate'} className="rounded-full px-4 h-8 flex items-center">
              {stats.pendingLeaves} Pending Leaves
           </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Global Lectures" value={loading ? '...' : stats.totalLectures} color="indigo" />
        <StatCard title="Weekly Velocity" value={loading ? '...' : stats.thisWeek} color="green" />
        <StatCard
          title="Proxy Alerts"
          value={loading ? '...' : pendingProxies.length}
          color={pendingProxies.length > 0 ? 'red' : 'slate'}
        />
      </div>

      {pendingProxies.length > 0 && (
         <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
            <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
               <ShieldCheck className="w-4 h-4" /> Attendance Approvals Required
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {pendingProxies.map(lp => (
                  <div key={lp.id} className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-center gap-4 group">
                     <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800 tracking-tight leading-none group-hover:text-red-700 transition-colors">
                           {lp.sub_code} • Lec {lp.lecture_no}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                           Marked by {lp.marked_by_name} • {lp.date}
                        </p>
                     </div>
                     <div className="flex gap-1.5">
                        <Button size="icon" variant="ghost" className="h-9 w-9 bg-white hover:bg-green-500 hover:text-white rounded-xl shadow-sm transition-all" onClick={() => handleApproveProxy(lp.id)}>
                           <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 bg-white hover:bg-red-500 hover:text-white rounded-xl shadow-sm transition-all" onClick={() => handleRejectProxy(lp.id)}>
                           <X className="w-4 h-4" />
                        </Button>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}

      <div>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Today's Grid
        </h3>
        {loading ? (
          <div className="h-32 flex items-center justify-center text-slate-300">Syncing schedule...</div>
        ) : todaySlots.length === 0 ? (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 mx-auto mb-4 opacity-20" />
            <p className="text-sm font-bold tracking-tight">No sessions assigned for today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {todaySlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white border border-slate-100 rounded-[2rem] p-6 flex flex-col gap-4 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                    {slot.lecture_no}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-lg leading-none truncate">{slot.subjects?.code}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider truncate">{slot.subjects?.name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-1.5">
                       {slot.isMarked ? (
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                       ) : (
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                       )}
                       <span className={`text-[10px] font-black uppercase tracking-widest ${slot.isMarked ? 'text-green-600' : 'text-indigo-500'}`}>
                          {slot.isMarked ? 'Verified' : `${slot.branch} S${slot.sem}`}
                       </span>
                    </div>
                    {slot.isMarked ? (
                       <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-full ring-1 ring-green-100">
                          <Check className="w-3 h-3" />
                          <span className="text-[10px] font-black uppercase">Sync Complete</span>
                       </div>
                    ) : (
                       slot.room && <span className="text-[10px] font-black text-slate-300 uppercase">Room {slot.room}</span>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, Bell, ChevronRight, Pin, Clock, MapPin } from 'lucide-react';
import { cn } from '../ui/Button';
import { Badge } from '../ui/Badge';

export const Pinboard = () => {
  const { role, user } = useAuth();
  const [timetable, setTimetable] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch data based on role
      // For simplicity, we fetch recent notices and today's timetable
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      let ttQuery = supabase.from('timetable').select('*, subjects(name, code)').eq('day_of_week', today);
      
      // If student, filter by their branch/sem
      if (role === 'student') {
        const { data: student } = await supabase.from('students').select('branch, sem').eq('user_id', user.id).single();
        if (student) {
          ttQuery = ttQuery.eq('branch', student.branch).eq('sem', student.sem);
        }
      }

      const [ttRes, noticesRes] = await Promise.all([
        ttQuery.order('lecture_no'),
        supabase.from('notices').select('*').eq('is_active', true).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(10)
      ]);

      setTimetable(ttRes.data || []);
      setNotices(noticesRes.data || []);
      setLoading(false);
    };
    fetchData();
  }, [role, user]);

  const getNoticeStyle = (type) => {
    switch (type.toLowerCase()) {
      case 'assignment': return 'bg-amber-50 border-amber-400';
      case 'lab': return 'bg-blue-50 border-blue-400';
      case 'library': return 'bg-green-50 border-green-400';
      default: return 'bg-slate-50 border-slate-300';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
      {/* Timetable Section (Left 60%) */}
      <div className="lg:col-span-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Today's Timetable
          </h3>
          <span className="text-xs text-slate-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          {loading ? (
            Array(4).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)
          ) : timetable.length > 0 ? (
            timetable.map((slot) => (
              <div key={slot.id} className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-indigo-50 text-indigo-700 rounded-md font-bold">
                    <span className="text-xs uppercase">Slot</span>
                    <span className="text-xl">{slot.lecture_no}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{slot.subjects?.name || 'Unknown'}</h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Slot {slot.lecture_no}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Room {slot.room || '—'}</span>
                    </div>
                  </div>
                </div>
                {slot.is_substitute && <Badge variant="warning">Substitute</Badge>}
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              No lectures scheduled for today.
            </div>
          )}
        </div>
      </div>

      {/* Notice Board (Right 40%) */}
      <div className="lg:col-span-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            Notice Board
          </h3>
          <button className="text-xs text-indigo-600 font-medium hover:underline">View All</button>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2 scrollbar-thin scrollbar-thumb-slate-200">
          {loading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg" />)
          ) : notices.length > 0 ? (
            notices.map((notice) => (
              <div key={notice.id} className={cn("p-4 rounded-lg border-l-4 shadow-sm", getNoticeStyle(notice.type))}>
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-slate-900 line-clamp-1">{notice.title}</h4>
                  {notice.is_pinned && <Pin className="h-3 w-3 text-indigo-500 fill-indigo-500" />}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-3">{notice.body}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{new Date(notice.created_at).toLocaleDateString('en-IN')}</span>
                  <Badge variant="ghost" className="text-[10px] uppercase font-bold px-1.5 py-0">
                    {notice.type}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
              No active notices.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

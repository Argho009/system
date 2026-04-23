import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';

export const TeacherHistory = () => {
  const { user } = useAuth();
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ from: '', to: '' });

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let data = await api.getLectures({ teacher_id: user.id });
      data = Array.isArray(data) ? data : [];
      if (filter.from) data = data.filter((l) => l.date >= filter.from);
      if (filter.to) data = data.filter((l) => l.date <= filter.to);
      data.sort((a, b) => {
        const d = b.date.localeCompare(a.date);
        if (d !== 0) return d;
        return (a.lecture_no || 0) - (b.lecture_no || 0);
      });
      setLectures(data);
    } catch {
      toast.error('Failed to load');
      setLectures([]);
    }
    setLoading(false);
  };

  const grouped = lectures.reduce((acc, l) => {
    const key = l.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Attendance History</h2>
        <p className="text-sm text-slate-500">All lectures you've conducted.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4 flex gap-4 items-end flex-wrap">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">From</label>
          <input
            type="date"
            className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={filter.from}
            onChange={(e) => setFilter({ ...filter, from: e.target.value })}
          />
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">To</label>
          <input
            type="date"
            className="h-10 rounded border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={filter.to}
            onChange={(e) => setFilter({ ...filter, to: e.target.value })}
          />
        </div>
        <Button onClick={fetchHistory}>Filter</Button>
        <Button
          variant="ghost"
          onClick={() => {
            setFilter({ from: '', to: '' });
            setTimeout(fetchHistory, 0);
          }}
        >
          Clear
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-slate-400">No lectures found.</p>
          )}
          {Object.entries(grouped).map(([date, dayLectures]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-slate-600 mb-2">
                {new Date(date).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <div className="space-y-2">
                {dayLectures.map((l) => (
                    <div
                      key={l.id}
                      className="group bg-white border border-slate-100 rounded-3xl px-6 py-4 flex items-center gap-6 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-lg shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        {l.lecture_no}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-base leading-tight truncate">
                          {l.subjects?.code} <span className="font-medium text-slate-400 mx-1">—</span> {l.subjects?.name}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1">
                          {l.subjects?.branch} • {l.academic_year}
                        </p>
                      </div>
                      
                      {l.is_skipped ? (
                        <Badge variant="warning" className="rounded-full px-4 h-8 flex items-center font-black">
                          SKIPPED
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                               <p className="text-lg font-black text-slate-900 leading-none">
                                  {l.present_count}<span className="text-slate-300 mx-0.5 text-sm">/</span>{l.total_count}
                               </p>
                               <div className="flex justify-end items-center gap-1 mt-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Present</p>
                                  {l.late_count > 0 && (
                                     <Badge variant="warning" className="text-[8px] px-1 py-0 h-3 leading-none font-bold">
                                        {l.late_count} LATE
                                     </Badge>
                                  )}
                               </div>
                            </div>
                           <div className="w-12 h-12 rounded-full border-4 border-slate-50 flex items-center justify-center relative overflow-hidden shrink-0">
                              <div 
                                 className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ${l.present_count/l.total_count >= 0.75 ? 'bg-green-500' : 'bg-amber-500'}`}
                                 style={{ height: `${(l.present_count / (l.total_count || 1)) * 100}%`, opacity: 0.2 }}
                              />
                              <span className="text-[10px] font-extrabold text-slate-800 relative z-10">
                                 {Math.round((l.present_count / (l.total_count || 1)) * 100)}%
                              </span>
                           </div>
                        </div>
                      )}
                      
                      {l.skip_reason && <p className="text-xs text-slate-400 italic max-w-[200px] truncate">{l.skip_reason}</p>}
                    </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

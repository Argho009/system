import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';
import { MapPin, Calendar as CalIcon, Clock } from 'lucide-react';

// A mock version of the timetable grid for the pinboard.
// Later pages will use a full editable TimetableGrid component.
const MiniTimetable = () => {
  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-md">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h3 className="font-semibold text-slate-800 flex items-center">
          <CalIcon className="w-4 h-4 mr-2 text-indigo-600" />
          Today's Timetable
        </h3>
        <span className="text-xs text-slate-500 font-medium">Auto-scrolls</span>
      </div>
      <div className="flex-1 p-4 flex flex-col items-center justify-center text-slate-400">
        {/* Placeholder for actual timetable grid */}
        <p className="text-sm">Grid will render here based on system_config N slots</p>
      </div>
    </div>
  );
};

const NoticeBoard = ({ user }) => {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    api
      .getNotices()
      .then((data) => setNotices((data || []).slice(0, 3)))
      .catch(() => setNotices([]));
  }, []);

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-md">
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-800">Notice Board</h3>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-64">
        {notices.length === 0 && <p className="text-sm text-slate-400 text-center mt-8">No new notices</p>}
        {notices.map(n => (
          <div key={n.id} className="p-3 bg-amber-50 border border-amber-400 rounded-md shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <Badge variant="warning"><span className="uppercase text-[10px]">{n.type}</span></Badge>
              {n.due_date && <span className="text-[10px] font-semibold text-amber-700">Due: {new Date(n.due_date).toLocaleDateString()}</span>}
            </div>
            <h4 className="mt-1 text-sm font-semibold text-slate-800">{n.title}</h4>
            <p className="mt-0.5 text-xs text-slate-600">By {n.users?.name || 'System'} • {new Date(n.created_at).toLocaleDateString()}</p>
            {user?.role === 'student' && n.type === 'Assignment' && (
              <div className="mt-3">
                <button className="text-xs bg-white text-slate-700 border border-slate-300 px-3 py-1 rounded hover:bg-slate-50 transition-colors">
                  View Assignment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Pinboard = () => {
  const { user } = useAuth();
  return (
    <div className="flex w-full space-x-6 h-72 mb-6">
      <div className="w-[60%] h-full">
        <MiniTimetable user={user} />
      </div>
      <div className="w-[40%] h-full">
        <NoticeBoard user={user} />
      </div>
    </div>
  );
};

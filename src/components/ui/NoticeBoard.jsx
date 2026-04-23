import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Badge } from './Badge';
import { Bell, Pin, Calendar, User, ChevronDown, ChevronUp } from 'lucide-react';

export const NoticeBoard = ({ branch, sem, role }) => {
  const [notices, setNotices] = useState([]);
  const [archived, setArchived] = useState([]);
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotices = async () => {
      setLoading(true);
      try {
        const data = await api.getNotices();
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter((n) => {
          const br = !branch || (n.branch === branch || n.branch === 'All' || n.branch == null);
          const sm = !sem || n.sem === sem || n.sem === 0 || n.sem == null;
          return br && sm && n.is_active;
        });
        setNotices(filtered.slice(0, 5));
        setArchived(filtered.slice(5));
      } catch {
        setNotices([]);
        setArchived([]);
      }
      setLoading(false);
    };

    fetchNotices();
  }, [branch, sem]);

  const getTypeColor = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'assignment':
        return 'red';
      case 'lab':
        return 'indigo';
      case 'library':
        return 'slate';
      default:
        return 'green';
    }
  };

  const NoticeCard = ({ notice }) => (
    <div
      className={`p-4 rounded-lg border bg-white shadow-sm transition-all hover:shadow-md ${notice.is_pinned ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-100'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {notice.is_pinned && (
            <Pin className="h-4 w-4 text-indigo-600 fill-indigo-600" />
          )}
          <Badge variant={getTypeColor(notice.type)} className="uppercase text-[10px]">
            {notice.type}
          </Badge>
        </div>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(notice.created_at).toLocaleDateString('en-IN')}
        </span>
      </div>
      <h4 className="font-semibold text-slate-800 mb-1">{notice.title}</h4>
      <p className="text-sm text-slate-600 line-clamp-3 mb-3">{notice.body}</p>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <User className="h-3 w-3" />
          {notice.users?.name || 'System'}
        </span>
        {notice.due_date && (
          <span className="text-xs font-medium text-red-600">
            Due: {new Date(notice.due_date).toLocaleDateString('en-IN')}
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-24 bg-slate-100 rounded-lg" />
        <div className="h-24 bg-slate-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800 font-semibold">
        <Bell className="h-5 w-5 text-indigo-600" />
        Notices
      </div>
      {notices.length === 0 && archived.length === 0 ? (
        <p className="text-sm text-slate-500">No notices.</p>
      ) : (
        <>
          <div className="grid gap-3">
            {notices.map((n) => (
              <NoticeCard key={n.id} notice={n} />
            ))}
          </div>
          {archived.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowArchive((v) => !v)}
                className="flex items-center gap-2 text-xs text-slate-500 hover:text-indigo-600 mb-2"
              >
                {showArchive ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Older ({archived.length})
              </button>
              {showArchive && (
                <div className="grid gap-3 opacity-90">
                  {archived.map((n) => (
                    <NoticeCard key={n.id} notice={n} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

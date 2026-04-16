import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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
      let query = supabase
        .from('notices')
        .select('*, users(name)')
        .eq('is_active', true)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (branch) query = query.in('branch', [branch, 'All']);
      if (sem) query = query.in('sem', [sem, 0]); // 0 for all sems

      const { data } = await query;
      
      if (data) {
        // Separate active and archived (we consider notices older than 30 days archived for UI purposes, or just use stays active)
        // Actually, the spec says "Archive collapsed at bottom". 
        // Let's take the first 10 as active, rest as archive? Or use a specific flag?
        // Usually notices have an expiration or just manual deactivation.
        // Let's assume the top 5 are "Current" and the rest are "Recent".
        setNotices(data.slice(0, 5));
        setArchived(data.slice(5));
      }
      setLoading(false);
    };

    fetchNotices();
  }, [branch, sem]);

  const getTypeColor = (type) => {
    switch (type.toLowerCase()) {
      case 'assignment': return 'red';
      case 'lab': return 'indigo';
      case 'library': return 'slate';
      default: return 'green';
    }
  };

  const NoticeCard = ({ notice }) => (
    <div className={`p-4 rounded-lg border bg-white shadow-sm transition-all hover:shadow-md ${notice.is_pinned ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {notice.is_pinned && <Pin className="h-4 w-4 text-indigo-600 fill-indigo-600" />}
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading notices...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-700 mb-2">
        <Bell className="h-5 w-5 text-indigo-600" />
        <h3 className="font-bold uppercase tracking-wider text-sm">Notice Board</h3>
      </div>

      {notices.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm text-slate-500">No active notices for your branch/sem.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {notices.map(n => <NoticeCard key={n.id} notice={n} />)}
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-6">
          <button 
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            {showArchive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showArchive ? 'Hide Archive' : `Show ${archived.length} Older Notices`}
          </button>
          
          {showArchive && (
            <div className="grid grid-cols-1 gap-4 mt-4 opacity-80">
              {archived.map(n => <NoticeCard key={n.id} notice={n} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

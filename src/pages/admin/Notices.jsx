import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { 
  Bell, Plus, Pin, Trash2, Calendar, 
  Target, Megaphone, Users, Landmark, 
  ChevronRight, Info, BookOpen, RefreshCw 
} from 'lucide-react';

export const AdminNotices = () => {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'General',
    branch: 'All',
    sem: '0',
    target_role: 'All',
    is_pinned: false,
    due_date: ''
  });

  const fetchData = async () => {
    setLoading(true);
    const [bRes, nRes] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('notices').select('*, users(name)').order('is_pinned', { ascending: false }).order('created_at', { ascending: false })
    ]);
    if (bRes.data) setBranches(bRes.data);
    if (nRes.data) setNotices(nRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('notices').insert({
        ...formData,
        created_by: user.id,
        sem: parseInt(formData.sem)
      });

      if (error) throw error;
      toast.success('Notice broadcasted successfully');
      setModalOpen(false);
      setFormData({ title: '', body: '', type: 'General', branch: 'All', sem: '0', target_role: 'All', is_pinned: false, due_date: '' });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return;
    const { error } = await supabase.from('notices').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else {
      toast.success('Notice removed');
      fetchData();
    }
  };

  const togglePin = async (notice) => {
    const { error } = await supabase.from('notices').update({ is_pinned: !notice.is_pinned }).eq('id', notice.id);
    if (!error) fetchData();
  };

  const filteredNotices = notices.filter(n => {
    const isOld = n.due_date && new Date(n.due_date) < new Date(new Date().setHours(0,0,0,0));
    return activeTab === 'active' ? !isOld : isOld;
  });

  const columns = [
    { 
      header: 'Announcement', 
      accessor: 'title', 
      render: (row) => (
        <div className="flex flex-col gap-1 max-w-sm">
          <div className="flex items-center gap-2">
            {row.is_pinned && <Pin className="h-3 w-3 text-indigo-600 fill-indigo-600 shrink-0" />}
            <span className="font-bold text-slate-900 line-clamp-1">{row.title}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{row.body}</span>
        </div>
      )
    },
    { 
      header: 'Category', 
      accessor: 'type', 
      render: (row) => (
        <Badge variant={row.is_pinned ? 'indigo' : 'default'} className="uppercase text-[9px] font-extrabold tracking-widest">
          {row.type}
        </Badge>
      )
    },
    { 
      header: 'Target Audience', 
      accessor: 'branch', 
      render: (row) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-tighter">
            <Target className="h-3 w-3 text-slate-400" />
            {(row.target_role || 'ALL').toUpperCase()}
          </div>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
            {row.branch} {row.sem !== 0 && `(SEM ${row.sem})`}
          </span>
        </div>
      )
    },
    { 
      header: 'Author', 
      accessor: 'users', 
      render: (row) => (
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
             {row.users?.name?.charAt(0)}
           </div>
           <span className="text-xs font-medium text-slate-600">{row.users?.name || 'System'}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-1">
           <Button variant="ghost" size="sm" className={row.is_pinned ? 'text-indigo-600' : 'text-slate-400'} onClick={() => togglePin(row)}>
             <Pin className="h-4 w-4" />
           </Button>
           <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(row.id)}>
             <Trash2 className="h-4 w-4" />
           </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
             <Megaphone className="h-4 w-4" />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Broadcast Center</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Notice Board</h2>
          <p className="text-sm text-slate-500 font-medium">Keep your institution informed with real-time announcements.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="px-8 shadow-lg shadow-indigo-100">
          <Plus className="h-4 w-4 mr-2" />
          Create Broadcast
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex p-1 bg-slate-100/80 rounded-2xl border border-slate-200 w-fit">
            <button
              className={`px-6 py-2.5 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('active')}
            >
              Active Feed
            </button>
            <button
              className={`px-6 py-2.5 text-[11px] font-extrabold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'old' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('old')}
            >
              Archived
            </button>
          </div>

          <div className="panel overflow-hidden border-slate-200/60 shadow-xl shadow-slate-100/50">
            <Table 
              columns={columns} 
              data={filteredNotices}
              loading={loading}
              emptyMessage={`No ${activeTab} announcements found.`}
            />
          </div>
        </div>

        <div className="space-y-6">
           <div className="panel p-6 bg-slate-900 border-none text-white overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <Bell className="h-20 w-20" />
              </div>
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-400" />
                Broadcast Logic
              </h3>
              <ul className="space-y-4 relative z-10">
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Pinned notices stay at the very top of all dashboards.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Targeted notices only appear for matching criteria.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Notices expire automatically after the due date.
                </li>
              </ul>
           </div>

           <div className="panel p-6 border-slate-100">
             <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-4">Live Statistics</h3>
             <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-600">Pinned Ratio</span>
                    <span className="text-indigo-600">{Math.round((notices.filter(n=>n.is_pinned).length / (notices.length || 1)) * 100)}%</span>
                  </div>
                  <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${(notices.filter(n=>n.is_pinned).length / (notices.length || 1)) * 100}%` }} />
                  </div>
               </div>
               <div className="flex items-center gap-3 pt-2">
                  <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Reach</p>
                    <p className="text-sm font-bold text-slate-700">All System Users</p>
                  </div>
               </div>
             </div>
           </div>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Broadcast Announcement">
        <form onSubmit={handleCreate} className="space-y-6">
          <Input 
            label="Internal Notice Title" 
            value={formData.title} 
            onChange={e => setFormData({...formData, title: e.target.value})} 
            placeholder="e.g., Upcoming Semester Registration Deadline" 
            required 
          />
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Announcement Content</label>
            <textarea 
              className="w-full min-h-[120px] p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-medium transition-all"
              value={formData.body}
              onChange={e => setFormData({...formData, body: e.target.value})}
              placeholder="Provide detailed instructions or information..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Category</label>
                <select className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-600 cursor-pointer" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option>General</option>
                  <option>Urgent</option>
                  <option>Exam</option>
                  <option>Fee</option>
                  <option>Holiday</option>
                </select>
             </div>
             <Input label="Expiry / Due Date" type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
          </div>

          <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
             <h4 className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-4">
               <Target className="h-3 w-3" />
               Audience Targeting
             </h4>
             <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5 text-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Role</label>
                  <select className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer" value={formData.target_role} onChange={e => setFormData({...formData, target_role: e.target.value})}>
                    <option value="All">All Roles</option>
                    <option value="student">Students</option>
                    <option value="teacher">Faculty</option>
                    <option value="hod">HODs</option>
                  </select>
                </div>
                <div className="space-y-1.5 text-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Branch</label>
                  <select className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})}>
                    <option value="All">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5 text-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Semester</label>
                  <select className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none cursor-pointer" value={formData.sem} onChange={e => setFormData({...formData, sem: e.target.value})}>
                    <option value="0">All Sems</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
                  </select>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setFormData({...formData, is_pinned: !formData.is_pinned})}>
             <div className={`p-1.5 rounded-lg ${formData.is_pinned ? 'bg-indigo-600 text-white' : 'bg-white text-slate-300'}`}>
                <Pin className="h-4 w-4" />
             </div>
             <div className="flex-1">
                <p className="text-xs font-bold text-slate-700">Pin to Top</p>
                <p className="text-[10px] text-slate-400 font-medium">Keep this announcement visible as a priority item.</p>
             </div>
             <div className={`h-4 w-4 rounded-full border-2 transition-all ${formData.is_pinned ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`} />
          </div>

          <div className="flex justify-end gap-3 pt-6">
             <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Discard</Button>
             <Button type="submit" disabled={loading} className="px-10">
               {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Broadcast Now'}
             </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

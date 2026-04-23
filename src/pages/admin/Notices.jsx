import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { Bell, Plus, Pin, Trash2, Calendar, Target } from 'lucide-react';

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
    is_pinned: false,
    due_date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const noticeTypeMap = (t) => {
    const x = (t || 'general').toLowerCase();
    if (x === 'event') return 'general';
    if (['assignment', 'lab', 'library', 'general'].includes(x)) return x;
    return 'general';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, nRes] = await Promise.all([api.getBranches(), api.getNotices()]);
      setBranches(Array.isArray(bRes) ? bRes.sort((a, b) => a.name.localeCompare(b.name)) : []);
      setNotices(Array.isArray(nRes) ? nRes : []);
    } catch {
      toast.error('Failed to load notices');
    }
    setLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createNotice({
        title: formData.title,
        body: formData.body,
        type: noticeTypeMap(formData.type),
        created_by: user.id,
        branch: formData.branch === 'All' ? 'All' : formData.branch,
        sem: parseInt(formData.sem, 10),
        due_date: formData.due_date || null,
      });
      toast.success('Notice published');
      setModalOpen(false);
      setFormData({
        title: '',
        body: '',
        type: 'General',
        branch: 'All',
        sem: '0',
        is_pinned: false,
        due_date: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to publish');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteNotice(id);
      toast.success('Notice removed');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const togglePin = async (notice) => {
    try {
      await api.patchNotice(notice.id, { is_pinned: !notice.is_pinned });
      fetchData();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-indigo-600" />
            Notice Board Management
          </h2>
          <p className="text-sm text-slate-500">Broadcast important information to students and faculty.</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Notice
        </Button>
      </div>

      <div className="flex space-x-1 border-b border-slate-200">
        <button
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          onClick={() => setActiveTab('active')}
        >
          Active Notices
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'old' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
          onClick={() => setActiveTab('old')}
        >
          Old Notices
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table 
          columns={[
             { 
               header: 'Title', 
               accessor: 'title', 
               render: (row) => (
                 <div className="flex items-center gap-2">
                   {row.is_pinned && <Pin className="h-3 w-3 text-indigo-600 fill-indigo-600" />}
                   <span className="font-medium">{row.title}</span>
                 </div>
               )
             },
             { header: 'Type', accessor: 'type', render: (row) => <Badge variant="slate" className="uppercase text-[10px]">{row.type}</Badge> },
             { header: 'Target', accessor: 'branch', render: (row) => <span className="text-xs text-slate-500">{row.branch} (Sem {row.sem === 0 ? 'All' : row.sem})</span> },
             { header: 'Created By', accessor: 'users', render: (row) => row.users?.name || 'System' },
             { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleDateString() },
             { 
               header: 'Actions', 
               accessor: 'id', 
               render: (row) => (
                 <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDelete(row.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                 </div>
               )
             }
          ]}
          data={notices.filter(n => {
            const isOld = n.due_date && new Date(n.due_date) < new Date(new Date().setHours(0,0,0,0));
            return activeTab === 'active' ? !isOld : isOld;
          })}
          emptyMessage={`No ${activeTab} notices found.`}
        />
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Broadcast New Notice">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Notice Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. End Semester Exam Schedule" required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description / Body</label>
            <textarea 
              className="w-full min-h-[100px] p-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
              value={formData.body}
              onChange={e => setFormData({...formData, body: e.target.value})}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <select className="w-full h-10 px-3 border rounded bg-white outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option>General</option>
                <option>Assignment</option>
                <option>Lab</option>
                <option>Library</option>
                <option>Event</option>
              </select>
            </div>
            <Input label="Due Date (Optional)" type="date" value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Branch</label>
              <select className="w-full h-10 px-3 border rounded bg-white outline-none" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})}>
                <option value="All">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Semester</label>
              <select className="w-full h-10 px-3 border rounded bg-white outline-none" value={formData.sem} onChange={e => setFormData({...formData, sem: e.target.value})}>
                <option value="0">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
             <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
             <Button type="submit">Publish Notice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

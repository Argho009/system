import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { toast } from '../../components/ui/Toast';
import { BookOpen, Search, Filter, UserCog, Plus, Trash2 } from 'lucide-react';

export const AdminSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    credits: 4,
    type: 'theory',
    branch: '',
    sem: '1'
  });

  const [assignmentData, setAssignmentData] = useState({
    teacher_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [branchesRes, subjectsRes, assignmentsRes, teachersRes] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('subjects').select('*').order('code'),
      supabase.from('subject_assignments').select('*, users:teacher_id(name)'),
      supabase.from('users').select('id, name').eq('role', 'teacher').eq('is_active', true)
    ]);

    if (branchesRes.data) setBranches(branchesRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    
    if (subjectsRes.data) {
      const enriched = subjectsRes.data.map(sub => {
        const assignment = assignmentsRes.data?.find(a => a.subject_id === sub.id);
        return {
          ...sub,
          teacher_name: assignment?.users?.name || 'Unassigned',
          teacher_id: assignment?.teacher_id || null
        };
      });
      setSubjects(enriched);
    }
    setLoading(false);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('subjects').insert({
      ...formData,
      sem: parseInt(formData.sem)
    });
    
    if (error) toast.error(error.message);
    else {
      toast.success('Subject created');
      setIsAddModalOpen(false);
      setFormData({ name: '', code: '', credits: 4, type: 'theory', branch: '', sem: '1' });
      fetchData();
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    const { data: config } = await supabase.from('system_config').select('value').eq('key', 'academic_year').single();
    
    const { error } = await supabase.from('subject_assignments').upsert({
      subject_id: selectedSubject.id,
      teacher_id: assignmentData.teacher_id,
      academic_year: config?.value || '2024-25'
    }, { onConflict: 'subject_id,academic_year' });

    if (error) toast.error(error.message);
    else {
      toast.success('Teacher assigned');
      setIsAssignModalOpen(false);
      fetchData();
    }
  };

  const filteredSubjects = subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         s.code.toLowerCase().includes(search.toLowerCase());
    const matchesBranch = branchFilter === 'All' || s.branch === branchFilter;
    const matchesSem = semFilter === 'All' || s.sem.toString() === semFilter;
    return matchesSearch && matchesBranch && matchesSem;
  });

  const assignedCount = subjects.filter(s => s.teacher_name !== 'Unassigned').length;
  const assignmentRate = subjects.length > 0 ? (assignedCount / subjects.length) * 100 : 0;

  const columns = [
    { header: 'Code', accessor: 'code', render: (row) => <span className="font-mono font-bold text-indigo-600">{row.code}</span> },
    { header: 'Subject Name', accessor: 'name' },
    { header: 'Credits', accessor: 'credits' },
    { 
      header: 'Type', 
      accessor: 'type',
      render: (row) => <Badge variant={row.type === 'lab' ? 'indigo' : 'default'} className="uppercase text-[10px]">{row.type}</Badge>
    },
    { 
      header: 'Assigned Teacher', 
      accessor: 'teacher_name',
      render: (row) => (
        <span className={row.teacher_name === 'Unassigned' ? 'text-red-400 italic text-xs' : 'text-slate-700 font-medium'}>
          {row.teacher_name}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-indigo-600"
          onClick={() => {
            setSelectedSubject(row);
            setAssignmentData({ teacher_id: row.teacher_id || '' });
            setIsAssignModalOpen(true);
          }}
        >
          <UserCog className="h-4 w-4 mr-1" />
          Assign
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Subject Management
          </h2>
          <p className="text-sm text-slate-500">Define curriculum and assign faculty members to subjects.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Teacher Assignment" 
          value={`${assignmentRate.toFixed(0)}%`} 
          subtitle={`${assignedCount} of ${subjects.length} assigned`}
          color={assignmentRate < 100 ? 'slate' : 'green'}
          className="md:col-span-1"
        />
        
        <div className="md:col-span-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text"
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
              placeholder="Search code or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select 
              className="border-slate-200 rounded-md text-sm py-2 pl-2 pr-8 focus:ring-indigo-600"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option>All Branches</option>
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
            <select 
              className="border-slate-200 rounded-md text-sm py-2 pl-2 pr-8 focus:ring-indigo-600"
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
            >
              <option>All Sems</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table columns={columns} data={filteredSubjects} emptyMessage="No subjects found matching your filters." />
      </div>

      {/* Add Subject Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Subject">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Subject Code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. CS101" required />
            <Input label="Subject Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Operating Systems" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
               <label className="text-sm font-medium">Branch</label>
               <select className="w-full h-10 px-3 border rounded bg-white outline-none focus:ring-2 focus:ring-indigo-600" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} required>
                 <option value="">Select Branch...</option>
                 {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
               </select>
             </div>
             <div className="space-y-1.5">
               <label className="text-sm font-medium">Semester</label>
               <select className="w-full h-10 px-3 border rounded bg-white outline-none focus:ring-2 focus:ring-indigo-600" value={formData.sem} onChange={e => setFormData({...formData, sem: e.target.value})} required>
                 {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
               </select>
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Credits" type="number" min="1" max="5" value={formData.credits} onChange={e => setFormData({...formData, credits: parseInt(e.target.value)})} required />
            <div className="space-y-1.5">
               <label className="text-sm font-medium">Type</label>
               <select className="w-full h-10 px-3 border rounded bg-white outline-none focus:ring-2 focus:ring-indigo-600" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} required>
                 <option value="theory">Theory</option>
                 <option value="lab">Lab / Practical</option>
                 <option value="elective">Elective</option>
               </select>
             </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Subject</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Teacher">
        <form onSubmit={handleAssignTeacher} className="space-y-4">
          <div className="p-3 bg-slate-50 border rounded text-sm mb-4">
            <span className="text-slate-500">Subject:</span> <span className="font-bold underline">{selectedSubject?.code} - {selectedSubject?.name}</span>
          </div>
          <div className="space-y-1.5">
             <label className="text-sm font-medium">Select Faculty Member</label>
             <select 
                className="w-full h-10 px-3 border rounded bg-white outline-none focus:ring-2 focus:ring-indigo-600" 
                value={assignmentData.teacher_id} 
                onChange={e => setAssignmentData({ teacher_id: e.target.value })}
                required
              >
                <option value="">Choose Teacher...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
             </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
            <Button type="submit">Complete Assignment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

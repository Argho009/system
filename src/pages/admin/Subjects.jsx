import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { 
  BookOpen, Search, Filter, UserCog, 
  Plus, Trash2, BookText, GraduationCap, 
  ChevronRight, Library, MoreVertical, 
  UserPlus, Link as LinkIcon 
} from 'lucide-react';

export const AdminSubjects = () => {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');

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
      supabase.from('users').select('id, name, college_id').eq('role', 'teacher').eq('is_active', true)
    ]);

    if (branchesRes.data) {
        setBranches(branchesRes.data);
        if (branchesRes.data.length > 0 && !formData.branch) {
            setFormData(prev => ({ ...prev, branch: branchesRes.data[0].name }));
        }
    }
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
    setLoading(true);
    try {
      const { error } = await supabase.from('subjects').insert({
        ...formData,
        sem: parseInt(formData.sem)
      });
      
      if (error) throw error;
      toast.success(`${formData.code} created successfully`);
      setIsAddModalOpen(false);
      setFormData({ name: '', code: '', credits: 4, type: 'theory', branch: branches[0]?.name || '', sem: '1' });
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!assignmentData.teacher_id) {
       toast.error('Select a teacher');
       return;
    }

    const { data: config } = await supabase.from('system_config').select('value').eq('key', 'academic_year').single();
    
    const { error } = await supabase.from('subject_assignments').upsert({
      subject_id: selectedSubject.id,
      teacher_id: assignmentData.teacher_id,
      academic_year: config?.value || '2024-25'
    }, { onConflict: 'subject_id,academic_year' });

    if (error) toast.error(error.message);
    else {
      toast.success('Teacher linked to subject');
      setIsAssignModalOpen(false);
      fetchData();
    }
  };

  const handleDeleteSubject = async (subject) => {
    if (!confirm(`Permanently delete ${subject.code}?`)) return;
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
    if (error) toast.error('Failed: ' + error.message);
    else {
      toast.success('Subject removed');
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

  const columns = [
    { 
      header: 'Subject Code', 
      accessor: 'code', 
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-black text-indigo-600 tracking-widest text-xs">{row.code.toUpperCase()}</span>
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-tighter">Credits: {row.credits}</span>
        </div>
      )
    },
    { 
      header: 'Course Information', 
      accessor: 'name',
      render: (row) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-bold text-slate-800 line-clamp-1">{row.name}</span>
          <div className="flex gap-2 items-center">
            <Badge variant="outline" className="text-[8px] px-1 py-0 border-slate-200">{row.type.toUpperCase()}</Badge>
            <span className="text-[10px] text-slate-400 font-bold uppercase">{row.branch} • SEM {row.sem}</span>
          </div>
        </div>
      )
    },
    { 
      header: 'Assigned Faculty', 
      accessor: 'teacher_name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border transition-all ${row.teacher_name === 'Unassigned' ? 'bg-red-50 text-red-400 border-red-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
            {row.teacher_name === 'Unassigned' ? '?' : row.teacher_name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className={`text-xs font-bold ${row.teacher_name === 'Unassigned' ? 'text-red-400 italic' : 'text-slate-700'}`}>
              {row.teacher_name}
            </span>
            {row.teacher_name !== 'Unassigned' && <span className="text-[9px] text-slate-400 font-bold uppercase">Primary Faculty</span>}
          </div>
        </div>
      )
    },
    {
      header: 'Operations',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-1">
           <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 rounded-lg" onClick={() => { setSelectedSubject(row); setAssignmentData({ teacher_id: row.teacher_id || '' }); setIsAssignModalOpen(true); }}>
             <UserCog className="h-4 w-4" />
           </Button>
           <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg" onClick={() => handleDeleteSubject(row)}>
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
             <Library className="h-4 w-4" />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Curriculum Management</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Courses</h2>
          <p className="text-sm text-slate-500 font-medium">Manage subject database and faculty linkings.</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="px-8 shadow-lg shadow-indigo-100">
          <Plus className="h-4 w-4 mr-2" />
          Add Course
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
           <div className="panel p-6 bg-slate-900 text-white border-none overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-24 w-24" />
              </div>
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <BookText className="h-5 w-5 text-indigo-400" />
                Integration Rules
              </h3>
              <ul className="space-y-4 relative z-10">
                <li className="flex gap-3 text-xs font-medium text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Course codes must align with state university guidelines.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Each course must have exactly one primary faculty for analytics.
                </li>
                <li className="flex gap-3 text-xs font-medium text-slate-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                  Lab courses automatically trigger separate marking schemes.
                </li>
              </ul>
           </div>

           <div className="panel p-6 border-slate-200">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">Quick Stats</h3>
              <div className="space-y-4">
                 <div>
                   <div className="flex justify-between text-xs font-bold mb-1.5">
                     <span className="text-slate-600">Faculty Coverage</span>
                     <span className="text-indigo-600">{subjects.length > 0 ? Math.round((subjects.filter(s=>s.teacher_name !== 'Unassigned').length / subjects.length) * 100) : 0}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-600" style={{ width: `${subjects.length > 0 ? (subjects.filter(s=>s.teacher_name !== 'Unassigned').length / subjects.length) * 100 : 0}%` }} />
                   </div>
                 </div>
                 <div className="flex items-center gap-3 pt-2">
                   <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shadow-sm">
                     <BookOpen className="h-4 w-4" />
                   </div>
                   <div>
                     <p className="text-[10px] font-extrabold text-slate-400 uppercase">Total Load</p>
                     <p className="text-sm font-black text-slate-700">{subjects.length} Courses</p>
                   </div>
                 </div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
           <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-100/50 bg-white">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-600/20 text-sm font-medium"
                    placeholder="Search curriculum database..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600/10" value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                    <option>All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                  </select>
                  <select className="h-11 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600/10" value={semFilter} onChange={e => setSemFilter(e.target.value)}>
                    <option value="All">All Sems</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>SEM {s}</option>)}
                  </select>
                </div>
              </div>

              <Table columns={columns} data={filteredSubjects} loading={loading} emptyMessage="No subjects found in the current archive." />
           </div>
        </div>
      </div>

      {/* Add Course Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Academic Course">
        <form onSubmit={handleAddSubject} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <Input label="Course Code" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} placeholder="e.g. CS501" required />
             <Input label="Course Title" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Artificial Intelligence" required />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Branch</label>
               <select className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.branch} onChange={e => setFormData({...formData, branch: e.target.value})} required>
                 {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Semester</label>
               <select className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.sem} onChange={e => setFormData({...formData, sem: e.target.value})} required>
                 {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credits</label>
               <input type="number" min="1" max="5" className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" value={formData.credits} onChange={e => setFormData({...formData, credits: parseInt(e.target.value)})} required />
             </div>
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Course Taxonomy</label>
             <div className="grid grid-cols-3 gap-3">
               {['theory', 'lab', 'elective'].map(t => (
                 <button key={t} type="button" onClick={() => setFormData({...formData, type: t})} className={`h-11 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all ${formData.type === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600'}`}>
                   {t}
                 </button>
               ))}
             </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
             <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Discard</Button>
             <Button type="submit" disabled={loading} className="px-10 h-11 rounded-xl shadow-lg shadow-indigo-100">
               {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Register Course'}
             </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Delegate Faculty Responsibilities">
        <form onSubmit={handleAssignTeacher} className="space-y-6">
          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3 text-indigo-700">
               <BookText className="h-5 w-5" />
               <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest mb-0.5">Linking Policy</span>
                  <span className="text-sm font-bold tracking-tight">{selectedSubject?.code} — {selectedSubject?.name}</span>
               </div>
            </div>
            <LinkIcon className="h-4 w-4 text-indigo-300" />
          </div>

          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Select Academic Professional</label>
             <select 
                className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 text-sm focus:ring-2 focus:ring-indigo-600" 
                value={assignmentData.teacher_id} 
                onChange={e => setAssignmentData({ teacher_id: e.target.value })}
                required
              >
                <option value="">Choose Faculty Member...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name} ({t.college_id})</option>)}
             </select>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-relaxed">
             linking a faculty member will grant them permissions to mark attendance, manage session plans, and upload continuous assessment marks for this subject.
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t">
             <Button variant="ghost" type="button" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
             <Button type="submit" className="px-10 h-11 rounded-xl shadow-lg shadow-indigo-100">
                Establish Link
             </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

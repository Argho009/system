import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
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

  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    branches: [], // Changed from branch: ''
    sem: '1',
  });

  const [assignmentData, setAssignmentData] = useState({
    teacher_id: '',
    branch_name: '', // Added branch_name
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [branchesRes, subjectsRes, assignmentsRes, usersRes] = await Promise.all([
        api.getBranches(),
        api.getSubjects(),
        api.getSubjectAssignments(),
        api.getUsers(),
      ]);

      setBranches(Array.isArray(branchesRes) ? branchesRes : []);
      const teachersList = (usersRes || []).filter(
        (u) => u.role === 'teacher' && (u.is_active === 1 || u.is_active === true)
      );
      setTeachers(teachersList);

      if (Array.isArray(subjectsRes)) {
        const enriched = subjectsRes.map((sub) => {
          const assignments = assignmentsRes?.filter((a) => a.subject_id === sub.id) || [];
          const teacherNames = assignments.map(a => a.users?.name).filter(Boolean).join(', ');
          
          return {
            ...sub,
            teacher_name: teacherNames || 'Unassigned',
            assignments, // Store full list for actions
          };
        });
        setSubjects(enriched);
      }
    } catch (e) {
      toast.error(e.message || 'Failed to load subjects');
    }
    setLoading(false);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (formData.branches.length === 0) {
      toast.error('Please select at least one branch');
      return;
    }
    
    try {
      await api.createSubject({
        name: formData.name,
        code: formData.code,
        sem: parseInt(formData.sem, 10),
        branches: formData.branches,
      });
      toast.success('Subject created successfully');
      setIsAddModalOpen(false);
      setFormData({ name: '', code: '', branches: [], sem: '1' });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Create failed');
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    const cfg = await api.getSystemConfig();
    const row = (cfg || []).find((c) => c.key === 'academic_year');
    const academicYear = row?.value || '2024-25';

    if (!assignmentData.teacher_id || !assignmentData.branch_name) {
      toast.error('Please select both a teacher and a branch');
      return;
    }

    try {
      const branchesToAssign = assignmentData.branch_name === 'ALL' 
        ? (selectedSubject.branches?.length > 0 ? selectedSubject.branches : [selectedSubject.branch])
        : [assignmentData.branch_name];

      for (const bname of branchesToAssign) {
        await api.upsertSubjectAssignment({
          subject_id: selectedSubject.id,
          teacher_id: assignmentData.teacher_id,
          branch_name: bname,
          academic_year: academicYear,
        });
      }
      
      toast.success(branchesToAssign.length > 1 ? 'Assigned to all branches' : 'Teacher assigned');
      setIsAssignModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    }
  };

  const handleUnassignTeacher = async (assignmentId) => {
    if (!confirm('Are you sure you want to unassign this teacher?')) return;
    try {
      await api.deleteSubjectAssignment(assignmentId);
      toast.success('Teacher unassigned');
      if (selectedSubject.assignments.length <= 1) {
        setIsAssignModalOpen(false);
      }
      fetchData();
    } catch (err) {
      toast.error('Failed to unassign: ' + (err.message || err));
    }
  };

  const handleDeleteSubject = async (subject) => {
    if (
      !confirm(
        `Are you sure you want to delete ${subject.code}? This will also remove it from timetables and assignments.`
      )
    )
      return;

    try {
      await api.deleteSubject(subject.id);
      toast.success(`${subject.code} deleted successfully`);
      fetchData();
    } catch (err) {
      toast.error('Failed to delete subject: ' + (err.message || err));
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchesBranch = branchFilter === 'All' || 
      (s.branches && s.branches.includes(branchFilter)) || 
      s.branch === branchFilter;
    const matchesSem = semFilter === 'All' || s.sem.toString() === semFilter;
    return matchesSearch && matchesBranch && matchesSem;
  });

  const assignedCount = subjects.filter((s) => s.teacher_name !== 'Unassigned').length;
  const assignmentRate = subjects.length > 0 ? (assignedCount / subjects.length) * 100 : 0;

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono font-bold text-indigo-600">{row.code}</span>
      ),
    },
    { header: 'Subject Name', accessor: 'name' },
    {
      header: 'Branches',
      accessor: 'branches',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {(row.branches || []).map((b) => (
            <Badge key={b} variant="slate" className="text-[10px] px-1 py-0">{b}</Badge>
          ))}
          {!row.branches?.length && row.branch && (
            <Badge variant="slate" className="text-[10px] px-1 py-0">{row.branch}</Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Assigned Teacher',
      accessor: 'teacher_name',
      render: (row) => (
        <span
          className={
            row.teacher_name === 'Unassigned'
              ? 'text-red-400 italic text-xs'
              : 'text-slate-700 font-medium'
          }
        >
          {row.teacher_name}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-indigo-600"
            onClick={() => {
              setSelectedSubject(row);
              setAssignmentData({ 
                teacher_id: '', 
                branch_name: row.branches?.[0] || row.branch || '' 
              }); 
              setIsAssignModalOpen(true);
            }}
          >
            <UserCog className="h-4 w-4 mr-1" />
            Assign
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0 px-2"
            title="Delete Subject"
            onClick={() => handleDeleteSubject(row)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-6">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="h-40 bg-slate-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            Subject Management
          </h2>
          <p className="text-sm text-slate-500">
            Define curriculum and assign faculty members to subjects.
          </p>
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
              {branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
            <select
              className="border-slate-200 rounded-md text-sm py-2 pl-2 pr-8 focus:ring-indigo-600"
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
            >
              <option>All Sems</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s.toString()}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={filteredSubjects}
          emptyMessage="No subjects found matching your filters."
        />
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Subject">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Subject Code"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              placeholder="e.g. CS101"
              required
            />
            <Input
              label="Subject Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Operating Systems"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">Select Branches</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 border rounded bg-slate-50">
                {branches.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-indigo-600">
                    <input
                      type="checkbox"
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                      checked={formData.branches.includes(b.name)}
                      onChange={(e) => {
                        const next = e.target.checked 
                          ? [...formData.branches, b.name]
                          : formData.branches.filter(name => name !== b.name);
                        setFormData({ ...formData, branches: next });
                      }}
                    />
                    {b.name}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Select all branches that will have this subject.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Semester</label>
              <select
                className="w-full h-10 px-3 border rounded bg-white outline-none focus:ring-2 focus:ring-indigo-600"
                value={formData.sem}
                onChange={(e) => setFormData({ ...formData, sem: e.target.value })}
                required
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s.toString()}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Subject</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Teacher">
        <form onSubmit={handleAssignTeacher} className="space-y-4">
          <div className="p-3 bg-slate-50 border rounded text-sm mb-4">
            <span className="text-slate-500">Subject:</span>{' '}
            <span className="font-bold underline">
              {selectedSubject?.code} - {selectedSubject?.name}
            </span>
          </div>
          <div className="space-y-3 mb-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Currently Assigned</h4>
            <div className="space-y-2">
              {selectedSubject?.assignments?.length > 0 ? (
                selectedSubject.assignments.map((ass) => (
                  <div key={ass.id} className="flex items-center justify-between p-2 bg-indigo-50 border border-indigo-100 rounded text-sm">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{ass.branch_name || 'All'}</span>
                      <span className="font-medium text-indigo-900">{ass.users?.name || 'Unknown'}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleUnassignTeacher(ass.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400 italic">No teachers assigned yet</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Branch</label>
              <select
                className="w-full h-10 px-3 border rounded bg-white outline-none focus:ring-2 focus:ring-indigo-600"
                value={assignmentData.branch_name}
                onChange={(e) => setAssignmentData({ ...assignmentData, branch_name: e.target.value })}
                required
              >
                <option value="">Choose Branch...</option>
                {selectedSubject?.branches?.length > 1 && (
                  <option value="ALL">All Selected Branches</option>
                )}
                {selectedSubject?.branches?.length > 0 ? (
                  selectedSubject.branches.map(b => <option key={b} value={b}>{b}</option>)
                ) : (
                  selectedSubject?.branch && <option value={selectedSubject.branch}>{selectedSubject.branch}</option>
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Select Teacher</label>
              <select
                className="w-full h-10 px-3 border rounded bg-white outline-none focus:ring-2 focus:ring-indigo-600"
                value={assignmentData.teacher_id}
                onChange={(e) => setAssignmentData({ ...assignmentData, teacher_id: e.target.value })}
                required
              >
                <option value="">Choose Teacher...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            {selectedSubject?.teacher_id ? (
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                type="button"
                onClick={handleUnassignTeacher}
              >
                Unassign Teacher
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Assignment</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

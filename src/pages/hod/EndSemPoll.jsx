import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';


export const HodEndSemPoll = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ branch: '', sem: '1', subject_id: '', academic_year: '2024-25' });
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchData();
    loadMetadata();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getEndsemMarks();
      setSubmissions(data || []);
    } catch {
      toast.error('Failed to load submissions');
    }
    setLoading(false);
  };

  const loadMetadata = async () => {
    try {
      const [bList, sList, config] = await Promise.all([
        api.getBranches(),
        api.getSubjects(),
        api.getSystemConfigKey('current_academic_year').catch(() => ({ value: '2024-25' }))
      ]);
      setBranches(bList || []);
      setSubjects(sList || []);
      setForm(prev => ({ ...prev, academic_year: config?.value || '2024-25' }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartPoll = async (e) => {
    e.preventDefault();
    setInitializing(true);
    try {
      await api.initializeEndsemPoll({
        ...form,
        sem: parseInt(form.sem, 10)
      });
      toast.success('Poll initialized for all students');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to initialize poll');
    }
    setInitializing(false);
  };

  const togglePoll = async (subjectId, academicYear, sem, currentState) => {
    try {
      await api.patchEndsemGroup({
        subject_id: subjectId,
        academic_year: academicYear,
        sem,
        poll_open: !currentState,
      });
      toast.success(`Poll ${!currentState ? 'opened' : 'closed'}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const lockMarks = async (subjectId, academicYear, sem) => {
    if (!window.confirm('Are you sure? This will lock all submissions for this subject.')) return;
    try {
      await api.patchEndsemGroup({
        subject_id: subjectId,
        academic_year: academicYear,
        sem,
        is_locked: true,
        verified_by: user.id,
      });
      toast.success('Marks locked and verified');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed');
    }
  };

  const grouped = submissions.reduce((acc, s) => {
    const key = `${s.subject_id}-${s.academic_year}-${s.sem}`;
    if (!acc[key]) acc[key] = { ...s, count: 0, submitted: 0 };
    acc[key].count += 1;
    if (s.marks !== null && s.marks !== undefined) acc[key].submitted += 1;
    return acc;
  }, {});

  const filteredSubjects = subjects.filter(s => 
    s.branch === form.branch && parseInt(s.sem, 10) === parseInt(form.sem, 10)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">End Semester Poll</h2>
          <p className="text-sm text-slate-500">Open/close mark submission polls and lock verified marks.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Start New Poll</Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-10">Loading...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
           <p className="text-slate-400">No active end semester polls.</p>
           <Button variant="ghost" className="mt-4" onClick={() => setIsModalOpen(true)}>Initialize a Poll Now</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.values(grouped).map((g) => (
            <div key={`${g.subject_id}-${g.academic_year}-${g.sem}`} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo">{g.subjects?.code}</Badge>
                    <Badge variant={g.is_locked ? 'success' : g.poll_open ? 'blue' : 'default'}>
                      {g.is_locked ? 'Locked' : g.poll_open ? 'Open' : 'Closed'}
                    </Badge>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sem {g.sem} • {g.academic_year}</span>
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg mb-1">{g.subjects?.name}</h3>
                
                <div className="flex-1 mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Submission Progress</span>
                    <span className="font-bold text-slate-700">{Math.round((g.submitted / g.count) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${(g.submitted / g.count) * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    <strong>{g.submitted}</strong> students submitted out of {g.count}
                  </p>
                </div>

                {!g.is_locked && (
                  <div className="flex gap-2 mt-6">
                    <Button
                      size="sm"
                      className="flex-1"
                      variant={g.poll_open ? 'secondary' : 'primary'}
                      onClick={() => togglePoll(g.subject_id, g.academic_year, g.sem, !!g.poll_open)}
                    >
                      {g.poll_open ? 'Stop Submission' : 'Accept Marks'}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => lockMarks(g.subject_id, g.academic_year, g.sem)}>
                      Verify & Lock
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize New Mark Poll">
        <form onSubmit={handleStartPoll} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Branch</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} required>
                   <option value="">Select Branch</option>
                   {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Semester</label>
                <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={form.sem} onChange={e => setForm({...form, sem: e.target.value})} required>
                   {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
             </div>
          </div>

          <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
              <select className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required>
                  <option value="">Select Subject</option>
                  {filteredSubjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
             <p className="text-xs text-amber-700 italic">This will create a mark placeholder for all students in this branch & semester and open it for submissions.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
             <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
             <Button type="submit" disabled={initializing || !form.subject_id}>
                {initializing ? 'Starting...' : 'Start Poll Now'}
             </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


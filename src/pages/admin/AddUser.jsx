import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../components/ui/Toast';

export const AddUser = () => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [formData, setFormData] = useState({
    college_id: '',
    name: '',
    role: 'student',
    password: '',
    roll_no: '',
    branch: '',
    sem: '1'
  });

  useEffect(() => {
    supabase.from('branches').select('*').order('name').then(({ data }) => {
      if (data) setBranches(data);
    });
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const finalCollegeId = formData.role === 'student' ? formData.roll_no : formData.college_id;
      const { data: newUserId, error: rpcError } = await supabase.rpc('create_system_user', {
        u_college_id: finalCollegeId,
        u_password: formData.password,
        u_name: formData.name,
        u_role: formData.role,
        u_branch: formData.branch || null,
        u_sem: formData.role === 'student' ? parseInt(formData.sem) : null,
        u_roll_no: formData.role === 'student' ? formData.roll_no : null
      });

      if (rpcError) throw rpcError;

      toast.success('User created and login activated!');
      setFormData({
        college_id: '', name: '', role: 'student', password: '', roll_no: '', branch: '', sem: '1'
      });
    } catch (error) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-6 animate-in fade-in duration-500">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Create New User Account</h3>
      <form onSubmit={handleCreateUser} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          {formData.role !== 'student' && (
            <Input 
              label="Login ID (Username)" 
              value={formData.college_id} 
              onChange={e => setFormData({...formData, college_id: e.target.value})} 
              placeholder="e.g. argho_teacher"
              required={formData.role !== 'student'} 
            />
          )}
          <Input 
            label="Full Name" 
            value={formData.name} 
            onChange={e => setFormData({...formData, name: e.target.value})} 
            required 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <select 
              className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="hod">HOD</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Input 
            label="Initial Password" 
            type="password" 
            value={formData.password} 
            onChange={e => setFormData({...formData, password: e.target.value})} 
            required 
          />
        </div>

        {formData.role === 'student' && (
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-300">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Student Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input 
                label="Roll No" 
                value={formData.roll_no} 
                onChange={e => setFormData({...formData, roll_no: e.target.value})} 
                required 
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Branch</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                  value={formData.branch}
                  onChange={e => setFormData({...formData, branch: e.target.value})}
                  required
                >
                  <option value="">Select...</option>
                  {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Semester</label>
                <select 
                  className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                  value={formData.sem}
                  onChange={e => setFormData({...formData, sem: e.target.value})}
                  required
                >
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </div>
      </form>
    </div>
  );
};

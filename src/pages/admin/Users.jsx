import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';
import { 
  Search, Filter, UserPlus, Download, Edit2, 
  Trash2, ShieldAlert, RefreshCw, Layers 
} from 'lucide-react';
import { exportCredentials } from '../../utils/exportExcel';
import { Link } from 'react-router-dom';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [branchFilter, setBranchFilter] = useState('All');
  const [semFilter, setSemFilter] = useState('All');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states (Editing only)
  const [formData, setFormData] = useState({
    name: '',
    role: 'student',
    roll_no: '',
    branch: '',
    sem: '1'
  });

  const fetchData = async () => {
    setLoading(true);
    const [branchesRes, usersRes, studentsRes] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('users').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('students').select('*')
    ]);

    if (branchesRes.data) setBranches(branchesRes.data);
    
    if (usersRes.data) {
      const enrichedUsers = usersRes.data.map(user => {
        const student = (studentsRes.data || []).find(s => s.user_id === user.id);
        return {
          ...user,
          roll_no: student?.roll_no || '',
          branch: student?.branch || '',
          sem: student?.sem || ''
        };
      });
      setUsers(enrichedUsers);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error: userError } = await supabase
        .from('users')
        .update({ name: formData.name, role: formData.role })
        .eq('id', selectedUser.id);
      
      if (userError) throw userError;

      if (formData.role === 'student') {
        const { error: studentError } = await supabase
          .from('students')
          .upsert({ 
            user_id: selectedUser.id,
            roll_no: formData.roll_no,
            branch: formData.branch,
            sem: parseInt(formData.sem)
          });
        if (studentError) throw studentError;
      }

      toast.success('User updated');
      setIsEditModalOpen(false);
      fetchData();
    } catch (err) {
      let msg = err.message || 'Update failed';
      if (msg.includes('students_roll_no_key')) {
        msg = 'Update Rejection: This Roll Number is already assigned to a different record.';
      } else if (msg.includes('users_college_id_key')) {
        msg = 'Update Rejection: This College ID is already registered.';
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const syncRow = async (user) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('sync_user_to_auth', { target_id: user.id });
      if (error) throw error;
      toast.success('Credentials synchronized!');
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmSoftDelete = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      toast.success(`Archived ${selectedUser.name}`);
      setIsConfirmOpen(false);
      fetchData();
    } catch (err) {
      toast.error('Archive failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                         u.college_id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter.toLowerCase();
    const matchesBranch = branchFilter === 'All' || u.branch === branchFilter;
    const matchesSem = semFilter === 'All' || String(u.sem ?? '') === semFilter;
    return matchesSearch && matchesRole && matchesBranch && matchesSem;
  });

  const columns = [
    { header: 'College ID', accessor: 'college_id', render: r => <span className="font-mono text-xs font-bold">{r.college_id}</span> },
    { header: 'Identity', accessor: 'name', render: r => <span className="font-bold text-slate-800">{r.name}</span> },
    { 
      header: 'Privilege', 
      accessor: 'role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'danger' : row.role === 'hod' ? 'purple' : 'default'} className="uppercase text-[9px]">
          {row.role}
        </Badge>
      )
    },
    { header: 'Academic Context', accessor: 'id', render: (row) => row.role === 'student' ? <span className="text-xs font-medium text-slate-500">{row.branch} (Roll: {row.roll_no})</span> : '—' },
    {
      header: 'Operations',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => {
            setSelectedUser(row);
            setFormData({
              name: row.name,
              role: row.role,
              roll_no: row.roll_no,
              branch: row.branch,
              sem: String(row.sem || '1')
            });
            setIsEditModalOpen(true);
          }}>
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-indigo-600" onClick={() => syncRow(row)} title="Sync Auth">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-amber-600" onClick={async () => {
              const newPass = prompt(`Enter new password for ${row.name}:`);
              if (newPass) {
                setLoading(true);
                try {
                  const { error } = await supabase.rpc('admin_reset_password', { 
                    target_id: row.id, 
                    new_password: newPass 
                  });
                  if (error) throw error;
                  toast.success('Password updated');
                } catch (err) {
                  toast.error('Update failed');
                } finally {
                  setLoading(false);
                }
              }
            }} title="Reset Password">
            <ShieldAlert className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => {
            setSelectedUser(row);
            setIsConfirmOpen(true);
          }} title="Archive">
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
             <Layers className="h-4 w-4" />
             <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Institutional Matrix</span>
           </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Active User Registry</h2>
          <p className="text-sm text-slate-500 font-medium">Monitoring and operational control for all system participants.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportCredentials(filteredUsers)}>
            <Download className="h-4 w-4 mr-2" />
            Registry Export (.xlsx)
          </Button>
          <Link to="/admin/bulk-upload">
            <Button className="shadow-lg shadow-indigo-100">
                <UserPlus className="h-4 w-4 mr-2" />
                Provision New Accounts
            </Button>
          </Link>
        </div>
      </div>

      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-100/50 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            className="w-full pl-12 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-bold text-slate-700"
            placeholder="Search by name, ID or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select 
            className="bg-slate-50 h-11 border border-slate-200 rounded-xl text-xs py-2 px-4 focus:ring-indigo-600 font-black uppercase tracking-wider cursor-pointer outline-none"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Roles</option>
            <option>Admin</option>
            <option>HOD</option>
            <option>Teacher</option>
            <option>Student</option>
          </select>
          
          <select 
            className="bg-slate-50 h-11 border border-slate-200 rounded-xl text-xs py-2 px-4 focus:ring-indigo-600 font-black uppercase tracking-wider cursor-pointer outline-none"
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="All">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
        <Table columns={columns} data={filteredUsers} emptyMessage="No active records found in registry." />
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Operational Override">
        <form onSubmit={handleUpdateUser} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Legal Name</label>
                <input 
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    required 
                />
            </div>
            
            <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Assigned Privilege</label>
                <select 
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                >
                    <option value="student">Student Account</option>
                    <option value="teacher">Faculty Account</option>
                    <option value="hod">HOD Account</option>
                    <option value="admin">System Admin</option>
                </select>
            </div>

            {formData.role === 'student' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Academic Roll No</label>
                  <input 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none"
                      value={formData.roll_no} 
                      onChange={e => setFormData({...formData, roll_no: e.target.value})} 
                      required 
                  />
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Current Semester</label>
                  <select 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer"
                      value={formData.sem}
                      onChange={e => setFormData({...formData, sem: e.target.value})}
                  >
                      {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={String(s)}>Semester {s}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">Branch/Department</label>
                  <select 
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none cursor-pointer"
                      value={formData.branch}
                      onChange={e => setFormData({...formData, branch: e.target.value})}
                  >
                      {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-900 leading-relaxed font-bold uppercase tracking-tighter">
              AFFECTS PUBLIC IDENTITY ONLY. TO REPAIR CREDENTIALS OR RESET FORGOTTEN PASSWORDS, USE THE "SYNC AUTH" INSTRUMENT IN THE REGISTRY TABLE.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-6">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="px-10 h-11 rounded-xl shadow-lg shadow-indigo-100">
                {loading ? 'Processing...' : 'Commit Update'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmSoftDelete}
        title="Sanitize Registry Record?"
        message={`Are you sure you want to archive ${selectedUser?.name}? Access will be revoked immediately. The record can be restored from the Recovery Terminal later.`}
        variant="danger"
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { toast } from '../../components/ui/Toast';
import { 
  Search, Filter, UserPlus, Download, Edit2, 
  UserX, UserCheck, ChevronDown, CheckCircle2, XCircle, Trash2, RotateCcw, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
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
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [branchesRes, usersRes, studentsRes] = await Promise.all([
      supabase.from('branches').select('*').order('name'),
      supabase.from('users').select('*').is('deleted_at', null).order('created_at', { ascending: false }),
      supabase.from('students').select('*')
    ]);

    if (branchesRes.data) setBranches(branchesRes.data);
    
    if (usersRes.data) {
      // Join students data locally if needed
      const enrichedUsers = usersRes.data.map(user => {
        const student = studentsRes.data?.find(s => s.user_id === user.id);
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
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Use the SQL helper to create both Auth and Public records in one transaction
      const { data: newUserId, error: rpcError } = await supabase.rpc('create_system_user', {
        u_college_id: formData.college_id,
        u_password: formData.password,
        u_name: formData.name,
        u_role: formData.role,
        u_branch: formData.branch || null,
        u_sem: formData.role === 'student' ? parseInt(formData.sem) : null,
        u_roll_no: formData.role === 'student' ? formData.roll_no : null
      });

      if (rpcError) throw rpcError;

      toast.success('User created and login activated!');
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates = { 
        name: formData.name,
        role: formData.role 
      };
      if (formData.password) {
        updates.initial_password = formData.password;
      }

      const { error: userError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', selectedUser.id);

      if (userError) throw userError;

      if (formData.role === 'student' && selectedUser.role === 'student') {
        const { error: studentError } = await supabase
          .from('students')
          .update({
             roll_no: formData.roll_no,
             branch: formData.branch,
             sem: parseInt(formData.sem)
          })
          .eq('user_id', selectedUser.id);
        if (studentError) throw studentError;
      }

      toast.success('User updated successfully');
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (user) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id);
    
    if (error) toast.error('Failed to update status');
    else {
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'}`);
      fetchData();
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.name}? This will remove them from all active lists.`)) return;
    
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString(), is_active: false })
      .eq('id', user.id);

    if (error) toast.error('Failed to delete user');
    else {
      toast.success('User moved to Recovery Archive');
      fetchData();
    }
  };

  const handleSyncToAuth = async (user) => {
    setLoading(true);
    const { error } = await supabase.rpc('sync_user_to_auth', { target_id: user.id });
    if (error) {
      toast.error('Sync failed: ' + error.message);
    } else {
      toast.success(`Account for ${user.name} is now ready for login!`);
    }
    setLoading(false);
  };

  const handleDownloadExcel = () => {
    const data = filteredUsers.map(u => ({
      'College ID': u.college_id,
      'Name': u.name,
      'Role': u.role,
      'Initial Password': u.initial_password
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Credentials');
    XLSX.writeFile(wb, `credentials_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success('Initial passwords only — users may have changed their passwords');
  };

  const resetForm = () => {
    setFormData({
      college_id: '',
      name: '',
      role: 'student',
      password: '',
      roll_no: '',
      branch: '',
      sem: '1'
    });
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                         u.college_id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'All' || u.role === roleFilter.toLowerCase();
    const matchesBranch = branchFilter === 'All' || u.branch === branchFilter;
    const matchesSem = semFilter === 'All' || u.sem.toString() === semFilter;
    
    return matchesSearch && matchesRole && matchesBranch && matchesSem;
  });

  const columns = [
    { header: 'College ID', accessor: 'college_id' },
    { header: 'Name', accessor: 'name' },
    { 
      header: 'Role', 
      accessor: 'role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'danger' : row.role === 'hod' ? 'purple' : 'default'} className="uppercase">
          {row.role}
        </Badge>
      )
    },
    { header: 'Branch', accessor: 'branch' },
    { header: 'Sem', accessor: 'sem' },
    { 
      header: 'Status', 
      accessor: 'is_active',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${row.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs text-slate-500">{row.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSelectedUser(row);
              setFormData({
                college_id: row.college_id,
                name: row.name,
                role: row.role,
                password: '',
                roll_no: row.roll_no,
                branch: row.branch,
                sem: row.sem.toString()
              });
              setIsEditModalOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={row.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-500 hover:text-green-700'}
            onClick={() => toggleStatus(row)}
            title={row.is_active ? "Deactivate" : "Activate"}
          >
            {row.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-indigo-600 hover:bg-indigo-50"
            onClick={() => handleSyncToAuth(row)}
            title="Sync to Auth Database"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-600 hover:bg-red-50"
            onClick={() => handleDeleteUser(row)}
            title="Delete User"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">User Management</h2>
          <p className="text-sm text-slate-500">View and manage all system users and their permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            setLoading(true);
            const { error } = await supabase.rpc('sync_all_users_to_auth');
            if (error) toast.error('Bulk sync failed: ' + error.message);
            else toast.success('All users are now fully synchronized and ready for login!');
            setLoading(false);
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setIsAddModalOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
            placeholder="Search name or college ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select 
            className="border-slate-200 rounded-md text-sm py-2 pl-2 pr-8 focus:ring-indigo-600"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option>All Roles</option>
            <option>Admin</option>
            <option>HOD</option>
            <option>Teacher</option>
            <option>Student</option>
          </select>
          
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

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table columns={columns} data={filteredUsers} emptyMessage="No users found matching your filters." />
      </div>

      {/* Add User Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Create New User Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="College ID (Username)" 
              value={formData.college_id} 
              onChange={e => setFormData({...formData, college_id: e.target.value})} 
              required 
            />
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

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="ghost" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title="Edit User Account"
      >
        <form onSubmit={handleEditUser} className="space-y-4">
          <Input label="Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          
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
              label="Reset Password (Optional)" 
              type="password" 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              placeholder="Leave blank to keep current"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

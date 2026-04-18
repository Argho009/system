import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { 
  User, Mail, Phone, MapPin, 
  Shield, Key, Save, UserCheck, 
  GraduationCap, Building, Hash 
} from 'lucide-react';

export const StudentProfile = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Password change
    const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });

    useEffect(() => {
        if (user) fetchProfile();
    }, [user]);

    async function fetchProfile() {
        setLoading(true);
        const { data } = await supabase
            .from('students')
            .select('*, users(*)')
            .eq('user_id', user.id)
            .single();
        if (data) setStudent(data);
        setLoading(false);
    }

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passForm.new !== passForm.confirm) return toast.error('Passwords do not match');
        if (passForm.new.length < 6) return toast.error('Password too short');

        setSaving(true);
        const { error } = await supabase.auth.updateUser({ password: passForm.new });
        if (error) toast.error(error.message);
        else {
            toast.success('Password updated successfully');
            setPassForm({ current: '', new: '', confirm: '' });
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-6 mb-8 mt-4">
                <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-200">
                    {student?.users?.name?.charAt(0)}
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-900">{student?.users?.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="indigo" className="text-[10px] uppercase font-bold tracking-widest">{student?.branch} • SEM {student?.sem}</Badge>
                        <span className="text-xs text-slate-400 font-bold px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">{student?.roll_no}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="panel p-8 bg-white border-slate-200 shadow-xl shadow-slate-200/50">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                           <UserCheck className="h-4 w-4" />
                           Academic Registry
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                            <InfoField icon={Hash} label="College ID" value={student?.users?.college_id} />
                            <InfoField icon={Mail} label="Academic Email" value={student?.users?.email} />
                            <InfoField icon={Building} label="Department" value={student?.branch} />
                            <InfoField icon={GraduationCap} label="Course/Year" value={`${student?.sem}nd Semester, B.Tech`} />
                            <InfoField icon={Phone} label="Contact Number" value={student?.phone || 'Not provided'} />
                            <InfoField icon={MapPin} label="Local Address" value={student?.address || 'Not registered'} />
                        </div>
                    </div>

                    <div className="panel p-8 bg-white border-slate-200 shadow-xl shadow-slate-200/50">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                           <Shield className="h-4 w-4 text-indigo-600" />
                           Parent/Guardian Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoField label="Primary Guardian" value={student?.parent_name || 'N/A'} />
                            <InfoField label="Emergency Contact" value={student?.parent_phone || 'N/A'} />
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="panel p-8 bg-slate-900 border-none shadow-2xl text-white sticky top-6">
                        <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                           <Key className="h-4 w-4" />
                           Security Override
                        </h3>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">New Password</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    value={passForm.new}
                                    onChange={e => setPassForm({...passForm, new: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">Confirm Password</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600"
                                    placeholder="••••••••"
                                    value={passForm.confirm}
                                    onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4 h-11 rounded-xl shadow-lg shadow-indigo-900/40" disabled={saving}>
                                {saving ? 'Syncing...' : 'Update Credentials'}
                                <Save className="h-4 w-4 ml-2" />
                            </Button>
                        </form>
                        
                        <div className="mt-8 pt-6 border-t border-slate-800">
                             <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                                <p className="text-[11px] text-indigo-300 font-medium leading-relaxed">
                                    Your account is protected by Supabase Auth encryption. Changing your password here will update access for both the portal and mobile app.
                                </p>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoField = ({ icon: Icon, label, value }) => (
    <div className="flex gap-4">
        {Icon && (
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl shrink-0 h-11 w-11 flex items-center justify-center">
                <Icon className="h-5 w-5 text-slate-400" />
            </div>
        )}
        <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-sm font-bold text-slate-700 truncate">{value || 'N/A'}</p>
        </div>
    </div>
);

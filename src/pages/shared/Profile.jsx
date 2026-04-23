import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../../components/ui/Badge';
import { User, Mail, Landmark, BookOpen, Fingerprint, GraduationCap, Calendar } from 'lucide-react';

export const Profile = () => {
    const { user, role } = useAuth();
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeepInfo = async () => {
            if (role === 'student' && user) {
                try {
                    const data = await api.getStudentForUser(user.id);
                    setStudentData(data);
                } catch (e) {
                    console.error("Failed to fetch student details", e);
                }
            }
            setLoading(false);
        };
        fetchDeepInfo();
    }, [user, role]);

    if (loading) return <div className="p-10 text-center text-slate-400">Loading profile...</div>;

    const details = [
        { label: 'Full Name', value: user?.name, icon: User },
    ];

    if (role === 'student' && studentData) {
        details.push(
            { label: 'Roll No (College ID)', value: studentData.roll_no || user?.college_id, icon: GraduationCap },
            { label: 'Branch', value: studentData.branch, icon: Landmark },
            { label: 'Semester', value: `Semester ${studentData.sem}`, icon: Calendar }
        );
    } else {
        details.push({ label: 'College ID', value: user?.college_id, icon: Fingerprint });
    }

    details.push({ label: 'System Role', value: role?.toUpperCase(), icon: BookOpen });


    return (
        <div className="max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border-4 border-white shadow-sm">
                    <User className="w-12 h-12" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{user?.name}</h2>
                    <div className="flex gap-2 mt-2">
                        <Badge variant="indigo">{role?.toUpperCase()}</Badge>
                        <Badge variant="outline">{user?.college_id}</Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {details.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:border-indigo-200 transition-colors">
                        <div className="p-3 rounded-lg bg-slate-50 text-slate-400">
                            <item.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                            <p className="text-lg font-semibold text-slate-800 mt-1">{item.value || 'N/A'}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-800 mb-2">Account Security</h3>
                <p className="text-sm text-slate-500 mb-4">You are currently logged in with your institutional credentials. contact the administrator to change your password.</p>
                <div className="flex gap-3">
                    <button disabled className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-400 cursor-not-allowed">Reset Password</button>
                    <button disabled className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-400 cursor-not-allowed">Setup MFA</button>
                </div>
            </div>
        </div>
    );
};

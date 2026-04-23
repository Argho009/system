import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { Calendar, Info } from 'lucide-react';

export const StudentTimetable = () => {
    const { user } = useAuth();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudent = async () => {
            if (user) {
                try {
                    const data = await api.getStudentForUser(user.id);
                    setStudent(data);
                } catch (e) {
                    console.error(e);
                }
            }
            setLoading(false);
        };
        fetchStudent();
    }, [user]);

    if (loading) return <div className="p-10 text-center text-slate-400">Loading your schedule...</div>;

    if (!student) return (
        <div className="p-10 text-center">
            <p className="text-red-500">Student profile not found. Please contact admin.</p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-indigo-600" />
                        My Weekly Timetable
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Schedule for {student.branch} • Semester {student.sem}</p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-100">
                    <Info className="w-4 h-4" />
                    Updates reflect here instantly
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <TimetableGrid 
                    branch={student.branch} 
                    sem={student.sem} 
                    editable={false} 
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 uppercase mb-2">Note</h4>
                    <ul className="text-xs text-slate-500 space-y-1 list-disc pl-4">
                        <li>Blue badges indicate temporary lecture adjustments.</li>
                        <li>Empty slots (—) indicate no lecture scheduled.</li>
                        <li>Room numbers are shown at the bottom of each slot.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

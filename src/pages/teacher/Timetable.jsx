import React, { useState, useEffect } from 'react';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { useAuth } from '../../hooks/useAuth';

export const TeacherTimetable = () => {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Personal <span className="text-indigo-600">Schedule</span></h2>
                <p className="text-sm text-slate-500 font-medium">Auto-generated weekly grid for all your assigned branches.</p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-8">
                <TimetableGrid 
                    teacherId={user.id} 
                    readOnly={true} 
                />
            </div>
        </div>
    );
};

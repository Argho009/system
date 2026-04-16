import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { Calendar, Filter } from 'lucide-react';

export const AdminTimetable = () => {
    const [branch, setBranch] = useState('');
    const [sem, setSem] = useState('1');
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        const fetchBranches = async () => {
            const { data } = await supabase.from('branches').select('*').order('name');
            if (data) {
                setBranches(data);
                if (data.length > 0) setBranch(data[0].name);
            }
        };
        fetchBranches();
    }, []);
    
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Calendar className="h-6 w-6 text-indigo-600" />
                        Timetable Management
                    </h2>
                    <p className="text-sm text-slate-500">Master schedule editor for all branches and semesters.</p>
                </div>
            </div>
            
            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm flex items-center gap-4">
                <div className="flex items-center gap-2 text-slate-500 mr-2">
                    <Filter className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Schedule Filter</span>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-400">Branch:</label>
                    <select 
                        className="border-slate-200 rounded-md text-sm py-1.5 pl-2 pr-8 focus:ring-indigo-600"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                    >
                        {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-400">Semester:</label>
                    <select 
                        className="border-slate-200 rounded-md text-sm py-1.5 pl-2 pr-8 focus:ring-indigo-600"
                        value={sem}
                        onChange={(e) => setSem(e.target.value)}
                    >
                        {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg">
                <TimetableGrid branch={branch} sem={parseInt(sem)} editable={true} />
            </div>

            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                <h4 className="text-xs font-bold text-indigo-700 uppercase mb-1">Editor Instructions</h4>
                <p className="text-xs text-indigo-600 leading-relaxed">
                    Click on any cell to assign a subject and room. All changes are logged and will be immediately reflected in the teacher and student dashboards. 
                    Badges indicate today's active substitutes or approved leaves.
                </p>
            </div>
        </div>
    );
};

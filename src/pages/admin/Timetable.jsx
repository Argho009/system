import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { Button } from '../../components/ui/Button';
import { 
  Calendar, Filter, FileSpreadsheet, 
  ChevronRight, Bookmark, LayoutGrid 
} from 'lucide-react';

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
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-indigo-600 mb-1">
                        <LayoutGrid className="h-4 w-4" />
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Academic Schedule</span>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        Master Timetable
                    </h2>
                    <p className="text-sm text-slate-500 font-medium">Configure and manage lecture slots for the current semester.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="bg-white border-slate-200">
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* Selection & Filter Bar */}
            <div className="bg-white p-2 border border-slate-200 rounded-2xl shadow-sm flex flex-wrap items-center gap-2">
                <div className="px-4 py-2 border-r border-slate-100 hidden md:block">
                   <div className="flex items-center gap-2 text-slate-400">
                     <Filter className="h-4 w-4" />
                     <span className="text-[10px] font-bold uppercase tracking-widest">Filter By</span>
                   </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 flex-1 min-w-[200px]">
                    <Bookmark className="h-3.5 w-3.5 text-slate-400 ml-2" />
                    <select 
                        className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer w-full pr-8"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                    >
                        {branches.map(b => <option key={b.id} value={b.name}>{b.name.toUpperCase()}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-100 w-full md:w-auto">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <button
                                key={s}
                                onClick={() => setSem(s.toString())}
                                className={`h-8 w-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${sem === s.toString() ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Status Breadcrumb */}
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest px-2">
                <span>College</span>
                <ChevronRight className="h-3 w-3" />
                <span>{branch}</span>
                <ChevronRight className="h-3 w-3" />
                <span className="text-indigo-600">Semester {sem}</span>
            </div>
            
            {/* Main Content Area */}
            <div className="bg-white p-1 border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="bg-slate-50/50 p-6">
                   <TimetableGrid 
                        branch={branch} 
                        sem={parseInt(sem)} 
                        editable={true} 
                    />
                </div>
            </div>

            {/* Editor Policy Alert */}
            <div className="p-6 bg-slate-900 rounded-2xl text-white flex items-start gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                    <Calendar className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                    <h4 className="text-sm font-bold mb-1">Administrative Override Mode</h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        Changes to the master timetable are permanent and affect all students and teachers in this branch/sem. 
                        Room numbers and teacher assignments must be manually verified to avoid scheduling conflicts. 
                        Click on any slot in the grid to modify or assign subjects.
                    </p>
                </div>
            </div>
        </div>
    );
};

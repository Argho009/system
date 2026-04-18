import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { Calendar, Plus, Trash2, ShieldAlert, Rocket } from 'lucide-react';

export const HodHolidays = () => {
    const { user } = useAuth();
    const [holidays, setHolidays] = useState([]);
    const [branch, setBranch] = useState('');
    const [loading, setLoading] = useState(false);
    const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });

    useEffect(() => {
        const fetchUserData = async () => {
            const { data } = await supabase.from('users').select('branch').eq('id', user.id).single();
            if (data?.branch) setBranch(data.branch);
        };
        fetchUserData();
    }, [user]);

    useEffect(() => {
        if (branch) fetchHolidays();
    }, [branch]);

    async function fetchHolidays() {
        setLoading(true);
        const { data } = await supabase.from('holidays')
            .select('*')
            .or(`branch.eq.${branch},branch.is.null`)
            .order('date', { ascending: true });
        if (data) setHolidays(data);
        setLoading(false);
    }

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newHoliday.date || !newHoliday.name) return;

        const { error } = await supabase.from('holidays').insert({
            date: newHoliday.date,
            name: newHoliday.name,
            branch: branch, // Department specific
            created_by: user.id
        });

        if (error) toast.error(error.message);
        else {
            toast.success('Department holiday added');
            setNewHoliday({ date: '', name: '' });
            fetchHolidays();
        }
    };

    const handleRemove = async (id, isGlobal) => {
        if (isGlobal) {
            toast.error('Cannot delete global holidays. Contact Admin.');
            return;
        }
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success('Holiday removed');
            fetchHolidays();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 mb-1">
                    <Rocket className="h-4 w-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">{branch} Department</span>
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Calendar Management</h2>
                  <p className="text-sm text-slate-500 font-medium">Declare local fests and departmental holidays.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="panel p-6 bg-white border-slate-200 shadow-xl shadow-slate-100/50">
                        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                           <Plus className="h-4 w-4" />
                           Declare Holiday
                        </h3>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <Input 
                                label="Holiday Date" 
                                type="date" 
                                value={newHoliday.date}
                                onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                                required
                            />
                            <Input 
                                label="Reason / Event Name" 
                                placeholder="e.g. Branch Fest '26" 
                                value={newHoliday.name}
                                onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                                required
                            />
                            <Button type="submit" className="w-full h-11 rounded-xl shadow-lg shadow-indigo-100 mt-2">
                                Register Date
                            </Button>
                        </form>
                    </div>

                    <div className="panel p-6 bg-indigo-50 border-indigo-100 mt-6">
                        <div className="flex items-center gap-2 text-indigo-600 font-bold text-[10px] uppercase tracking-widest mb-3">
                          <ShieldAlert className="h-4 w-4" />
                          Authority Scope
                        </div>
                        <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">
                          You can declare holidays specific to the <strong>{branch}</strong> branch. Global holidays (greyed out) can only be managed by the Institute Admin.
                        </p>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    <div className="panel p-0 overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50 bg-white">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-indigo-600" />
                                Upcoming Schedule
                            </h3>
                            <Badge variant="indigo" className="text-[10px] uppercase font-bold tracking-tighter">
                                {holidays.length} Total Dates
                            </Badge>
                        </div>
                        <Table 
                            columns={[
                                { 
                                    header: 'Date', 
                                    accessor: 'date', 
                                    render: (row) => (
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-700 text-sm">
                                                {new Date(row.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                                {new Date(row.date).toLocaleDateString('en-IN', { weekday: 'long' })}
                                            </span>
                                        </div>
                                    ) 
                                },
                                { 
                                    header: 'Event Name', 
                                    accessor: 'name',
                                    render: (row) => (
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${!row.branch ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                                            <span className={`font-semibold ${!row.branch ? 'text-slate-400' : 'text-slate-800'}`}>{row.name}</span>
                                        </div>
                                    )
                                },
                                { 
                                    header: 'Scope', 
                                    accessor: 'branch',
                                    render: (row) => (
                                        <Badge variant={!row.branch ? 'slate' : 'indigo'} className="text-[9px] uppercase font-bold">
                                            {!row.branch ? 'GLOBAL' : `DEPT: ${row.branch}`}
                                        </Badge>
                                    )
                                },
                                {
                                    header: 'Actions',
                                    accessor: 'id',
                                    render: (row) => (
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                                            disabled={!row.branch}
                                            onClick={() => handleRemove(row.id, !row.branch)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )
                                }
                            ]}
                            data={holidays}
                            loading={loading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

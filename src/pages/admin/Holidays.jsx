import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { toast } from '../../components/ui/Toast';
import { useAuth } from '../../hooks/useAuth';
import { Calendar, Plus, Trash2, PartyPopper } from 'lucide-react';

export const AdminHolidays = () => {
    const { user } = useAuth();
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        date: '',
        reason: ''
    });

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('holidays')
            .select('*')
            .order('date', { ascending: true });
        
        if (error) {
            toast.error('Failed to fetch holidays');
        } else {
            setHolidays(data || []);
        }
        setLoading(false);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('holidays').insert({
            ...formData,
            added_by: user.id
        });

        if (error) {
            toast.error(error.message);
        } else {
            toast.success('Holiday added successfully');
            setIsModalOpen(false);
            setFormData({ date: '', reason: '' });
            fetchHolidays();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to remove this holiday?')) return;
        
        const { error } = await supabase.from('holidays').delete().eq('id', id);
        if (error) {
            toast.error('Failed to delete holiday');
        } else {
            toast.success('Holiday removed');
            fetchHolidays();
        }
    };

    const columns = [
        { 
            header: 'Date', 
            accessor: 'date',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium text-slate-700">
                        {new Date(row.date).toLocaleDateString('en-IN', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                        })}
                    </span>
                </div>
            )
        },
        { header: 'Reason / Occasion', accessor: 'reason' },
        {
            header: 'Actions',
            accessor: 'id',
            render: (row) => (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => handleDelete(row.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <PartyPopper className="h-6 w-6 text-indigo-600" />
                        Holidays Management
                    </h2>
                    <p className="text-sm text-slate-500">Add and manage official college holidays.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                </Button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <Table 
                    columns={columns} 
                    data={holidays} 
                    loading={loading}
                    emptyMessage="No holidays scheduled yet." 
                />
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Holiday">
                <form onSubmit={handleCreate} className="space-y-4">
                    <Input 
                        label="Date" 
                        type="date" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                        required 
                    />
                    <Input 
                        label="Reason / Occasion" 
                        value={formData.reason} 
                        onChange={e => setFormData({...formData, reason: e.target.value})} 
                        placeholder="e.g. Independence Day, Winter Break" 
                        required 
                    />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Add Holiday</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

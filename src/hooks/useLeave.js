import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';

export const useLeave = () => {
    const [loading, setLoading] = useState(false);

    const getLeaveRequests = useCallback(async (role, userId) => {
        setLoading(true);
        try {
            let query = supabase.from('leave_requests').select('*, teacher:teacher_id(name), reviewed:reviewed_by(name)');
            if (role === 'teacher') query = query.eq('teacher_id', userId);
            const { data } = await query.order('created_at', { ascending: false });
            return data || [];
        } catch (err) {
            toast.error('Failed to load leave requests');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const submitLeaveRequest = useCallback(async (leaveData, userId) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('leave_requests').insert({
                ...leaveData,
                teacher_id: userId
            });
            if (error) throw error;
            toast.success('Leave request submitted');
            return true;
        } catch (err) {
            toast.error(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, getLeaveRequests, submitLeaveRequest };
};

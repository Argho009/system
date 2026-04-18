import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';

export const useCondonation = () => {
    const [loading, setLoading] = useState(false);

    const getCondonations = useCallback(async (role, userId, studentId = null) => {
        setLoading(true);
        try {
            let query = supabase.from('attendance_condonation').select('*, subjects(code, name), student:student_id(roll_no, user_id, users(name))');
            if (role === 'student') query = query.eq('student_id', studentId);
            const { data } = await query.order('created_at', { ascending: false });
            return data || [];
        } catch (err) {
            toast.error('Failed to load condonations');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const submitCondonation = async (condData, userId, studentId) => {
        setLoading(true);
        try {
            const { data: config } = await supabase.from('system_config').select('value').eq('key', 'current_academic_year').single();
            const year = config?.value || '2024-25';
            const { data: stu } = await supabase.from('students').select('sem').eq('id', studentId).single();

            const { error } = await supabase.from('attendance_condonation').insert({
                ...condData,
                student_id: studentId,
                requested_by: userId,
                academic_year: year,
                sem: stu?.sem || 1
            });
            if (error) throw error;
            toast.success('Condonation requested');
            return true;
        } catch (err) {
            toast.error(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { loading, getCondonations, submitCondonation };
};

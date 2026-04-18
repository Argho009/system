import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';

export const useNotices = () => {
    const [loading, setLoading] = useState(false);

    const getActiveNotices = useCallback(async (branch, sem) => {
        setLoading(true);
        try {
            let query = supabase.from('notices').select('*, subjects(code, name)').eq('is_active', true);
            if (branch && sem) {
                query = query.or(`branch.eq.${branch},branch.is.null`).eq('sem', sem);
            }
            const { data } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false });
            return data || [];
        } catch (err) {
            toast.error('Failed to load notices');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    const createNotice = useCallback(async (noticeData, userId) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('notices').insert({
                ...noticeData,
                created_by: userId
            });
            if (error) throw error;
            toast.success('Notice published');
            return true;
        } catch (err) {
            toast.error(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, getActiveNotices, createNotice };
};

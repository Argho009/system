import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';

export const useMarks = () => {
    const [loading, setLoading] = useState(false);

    const getStudentMarks = useCallback(async (studentId, sem) => {
        setLoading(true);
        try {
            const [ctRes, esRes] = await Promise.all([
                supabase.from('ct_marks').select('*, subjects(code, name)').eq('student_id', studentId).order('created_at', { ascending: false }),
                supabase.from('endsem_marks').select('*, subjects(code, name)').eq('student_id', studentId).eq('sem', sem),
            ]);
            return { ct: ctRes.data || [], endsem: esRes.data || [] };
        } catch (err) {
            toast.error('Failed to load marks');
            return { ct: [], endsem: [] };
        } finally {
            setLoading(false);
        }
    }, []);

    const uploadCtMarks = useCallback(async (subjectId, testName, marksData, teacherId) => {
        setLoading(true);
        try {
            const { data: config } = await supabase.from('system_config').select('value').eq('key', 'current_academic_year').single();
            const year = config?.value || '2024-25';

            const { error } = await supabase.from('ct_marks').upsert(
                marksData.map(m => ({
                    student_id: m.student_id,
                    subject_id: subjectId,
                    test_name: testName,
                    marks_obtained: m.marks,
                    max_marks: m.max_marks,
                    uploaded_by: teacherId,
                    academic_year: year
                })),
                { onConflict: 'student_id,subject_id,test_name,academic_year' }
            );
            if (error) throw error;
            toast.success('Marks uploaded successfully');
            return true;
        } catch (err) {
            toast.error(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, getStudentMarks, uploadCtMarks };
};

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';
import { rawPercent, finalPercent } from '../utils/attendanceCalc';

export const useAttendance = () => {
  const [loading, setLoading] = useState(false);

  const getStudentAttendanceSummary = useCallback(async (studentId, branch, sem) => {
    setLoading(true);
    try {
      const [subjects, lectures, attendance, condonation] = await Promise.all([
        supabase.from('subjects').select('*').eq('branch', branch).eq('sem', sem),
        supabase.from('lectures').select('id, subject_id').eq('sem', sem).eq('is_skipped', false),
        supabase.from('attendance').select('lecture_id, status, lectures(subject_id)').eq('student_id', studentId),
        supabase.from('attendance_condonation').select('subject_id, lectures_condoned').eq('student_id', studentId).eq('status', 'approved')
      ]);

      const summary = (subjects.data || []).map(sub => {
        const subLectures = (lectures.data || []).filter(l => l.subject_id === sub.id);
        const subAtt = (attendance.data || []).filter(a => subLectures.some(l => l.id === a.lecture_id));
        const present = subAtt.filter(a => a.status === 'present').length;
        const total = subLectures.length;
        const condoned = (condonation.data || []).filter(c => c.subject_id === sub.id).reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);
        
        return {
          ...sub,
          present, total, condoned,
          raw: rawPercent(present, total),
          final: finalPercent(present, condoned, total)
        };
      });
      return summary;
    } catch (err) {
      toast.error('Failed to load attendance');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getSubjectAttendanceList = useCallback(async (subjectId, branch, sem) => {
    setLoading(true);
    try {
      const [students, lectures, attendance, condonation] = await Promise.all([
        supabase.from('students').select('id, roll_no, users(name)').eq('branch', branch).eq('sem', sem).order('roll_no'),
        supabase.from('lectures').select('id').eq('subject_id', subjectId).eq('is_skipped', false),
        supabase.from('attendance').select('lecture_id, student_id, status').eq('academic_year', '2024-25'), // Simplified year
        supabase.from('attendance_condonation').select('student_id, lectures_condoned').eq('subject_id', subjectId).eq('status', 'approved')
      ]);

      const totalLectures = (lectures.data || []).length;

      return (students.data || []).map(stu => {
        const stuAtt = (attendance.data || []).filter(a => a.student_id === stu.id && (lectures.data || []).some(l => l.id === a.lecture_id));
        const present = stuAtt.filter(a => a.status === 'present').length;
        const condoned = (condonation.data || []).filter(c => c.student_id === stu.id).reduce((acc, c) => acc + c.lectures_condoned, 0);
        
        return {
          ...stu,
          total: totalLectures,
          present,
          condoned,
          raw: rawPercent(present, totalLectures),
          final: finalPercent(present, condoned, totalLectures)
        };
      });
    } catch (err) {
      toast.error('Failed to load subject attendance');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, getStudentAttendanceSummary, getSubjectAttendanceList };
};

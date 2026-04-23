import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { StatCard } from './StatCard';
import { Table } from './Table';
import { Badge } from './Badge';

export const AttendanceTable = ({ subjectId, studentId }) => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({ total: 0, present: 0, condoned: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);

      const lecRes = await api.getLectures({ subject_id: subjectId, is_skipped: 'false' });
      const lectures = (Array.isArray(lecRes) ? lecRes : []).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );

      if (!lectures.length) {
        setData([]);
        setStats({ total: 0, present: 0, condoned: 0 });
        setLoading(false);
        return;
      }

      const lectureIds = lectures.map((l) => l.id);
      const lecQs = lectureIds.join(',');

      let attendanceQuery = api.getAttendance({ lecture_ids: lecQs });
      if (studentId) {
        attendanceQuery = api.getAttendance({ lecture_ids: lecQs, student_id: studentId });
      }
      const attendance = await attendanceQuery;

      let condonationQuery = studentId
        ? api.getAttendanceCondonation({ student_id: studentId })
        : api.getAttendanceCondonation();
      const condonRaw = await condonationQuery;
      const condonations = (Array.isArray(condonRaw) ? condonRaw : []).filter(
        (c) => c.subject_id === subjectId && c.status === 'approved'
      );
      const totalCondoned = condonations.reduce(
        (acc, curr) => acc + (curr.lectures_condoned || 0),
        0
      );

      if (studentId) {
        const studentAttendance = lectures.map((l) => {
          const record = attendance?.find((a) => a.lecture_id === l.id);
          return {
            ...l,
            status: record?.status || 'N/A',
            remarks: record?.remarks || '',
          };
        });
        setData(studentAttendance);

        const presentCount =
          attendance?.filter((a) => a.status === 'present').length || 0;
        setStats({
          total: lectures.length,
          present: presentCount,
          condoned: totalCondoned,
        });
      } else {
        const subjects = await api.getSubjects();
        const subject = subjects?.find((s) => s.id === subjectId);
        const studentsRes = await api.getStudents({
          branch: subject?.branch,
          sem: subject?.sem,
        });

        const aggregateData = (studentsRes || []).map((s) => {
          const sAttendance =
            attendance?.filter((a) => a.student_id === s.id) || [];
          const present = sAttendance.filter((a) => a.status === 'present').length;
          const rawPercent = (present / lectures.length) * 100;
          const condForStudent = condonations
            .filter((c) => c.student_id === s.id)
            .reduce((acc, c) => acc + (c.lectures_condoned || 0), 0);
          const finalPercent = Math.min(
            100,
            ((present + condForStudent) / lectures.length) * 100
          );

          return {
            id: s.id,
            roll_no: s.roll_no,
            name: s.users?.name,
            total: lectures.length,
            present,
            absent: lectures.length - present,
            rawPercent,
            finalPercent,
          };
        });
        setData(aggregateData || []);
        setStats({ total: lectures.length, present: 0, condoned: 0 });
      }

      setLoading(false);
    };

    if (subjectId) {
      fetchAttendance();
    }
  }, [subjectId, studentId]);

  if (loading) return <div className="p-8 text-center">Loading attendance data...</div>;

  const rawPercent = stats.total > 0 ? (stats.present / stats.total) * 100 : 0;
  const finalPercent =
    stats.total > 0
      ? Math.min(100, ((stats.present + stats.condoned) / stats.total) * 100)
      : 0;

  if (studentId) {
    const columns = [
      {
        header: 'Date',
        accessor: 'date',
        render: (row) => new Date(row.date).toLocaleDateString('en-IN'),
      },
      { header: 'Lec No', accessor: 'lecture_no' },
      {
        header: 'Status',
        accessor: 'status',
        render: (row) => (
          <Badge variant={row.status === 'present' ? 'success' : 'danger'}>
            {String(row.status).toUpperCase()}
          </Badge>
        ),
      },
      { header: 'Remarks', accessor: 'remarks' },
    ];

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total Lectures" value={stats.total} color="indigo" />
          <StatCard
            title="Raw Attendance"
            value={`${rawPercent.toFixed(1)}%`}
            color={rawPercent < 75 ? 'red' : 'green'}
          />
          <StatCard
            title="Final Attendance"
            value={`${finalPercent.toFixed(1)}%`}
            subtitle={`Incl. ${stats.condoned} condoned`}
            color={finalPercent < 75 ? 'red' : 'green'}
          />
        </div>
        <Table columns={columns} data={data} emptyMessage="No attendance records found." />
      </div>
    );
  }

  const aggregateColumns = [
    { header: 'Roll No', accessor: 'roll_no' },
    { header: 'Name', accessor: 'name' },
    { header: 'Total', accessor: 'total' },
    { header: 'Present', accessor: 'present' },
    { header: 'Absent', accessor: 'absent' },
    {
      header: 'Raw %',
      accessor: 'rawPercent',
      render: (row) => (
        <span className={row.rawPercent < 75 ? 'text-red-600 font-medium' : ''}>
          {row.rawPercent.toFixed(1)}%
        </span>
      ),
    },
    {
      header: 'Final %',
      accessor: 'finalPercent',
      render: (row) => (
        <Badge
          variant={
            row.finalPercent < 65 ? 'danger' : row.finalPercent < 75 ? 'warning' : 'success'
          }
        >
          {row.finalPercent.toFixed(1)}%
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <StatCard title="Total Lectures Held" value={stats.total} color="indigo" className="max-w-xs" />
      <Table columns={aggregateColumns} data={data} emptyMessage="No students found." />
    </div>
  );
};

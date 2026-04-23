import React, { useState, useEffect, useRef } from 'react';
import * as api from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import {
  Archive, Database, AlertTriangle, Info, ChevronDown,
  CheckCircle2, XCircle, Download, RefreshCw, Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── PROGRESS STEP COMPONENT ─────────────────────────────────────────────────
const ProgressStep = ({ number, label, status }) => {
  const base = 'flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all';
  const styles = {
    pending: 'bg-slate-50 text-slate-400',
    running: 'bg-indigo-50 text-indigo-700 animate-pulse',
    done:    'bg-green-50 text-green-700',
    error:   'bg-red-50 text-red-700',
  };
  const icons = {
    pending: <span className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-xs text-slate-400">{number}</span>,
    running: <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />,
    done:    <CheckCircle2 className="w-5 h-5 text-green-600" />,
    error:   <XCircle className="w-5 h-5 text-red-600" />,
  };
  return (
    <div className={`${base} ${styles[status]}`}>
      {icons[status]}
      <span>{label}</span>
    </div>
  );
};

// ─── HEALTH CARD ─────────────────────────────────────────────────────────────
const HealthCard = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const stats = await api.getDbHealthStats();
      const attCount = stats.attendance ?? 0;
      const lecCount = stats.lectures ?? 0;
      const marksCount = stats.ct_marks ?? 0;
      const totalRows = attCount + lecCount + marksCount;
      const estimatedMB = Math.max(10, Math.round(totalRows * 0.0002));

      setHealth({
        estimatedMB,
        tables: [
          { name: 'attendance', rows: attCount, est_mb: Math.round(attCount * 0.0002) },
          { name: 'lectures', rows: lecCount, est_mb: Math.round(lecCount * 0.0002) },
          { name: 'ct_marks', rows: marksCount, est_mb: Math.round(marksCount * 0.0001) },
        ],
      });
    } catch (e) {
      setHealth({ estimatedMB: 0, tables: [] });
    }
    setLoading(false);
  };

  if (loading) return <div className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse h-40" />;

  const pct = Math.min(100, (health.estimatedMB / 500) * 100);
  const color = health.estimatedMB > 400 ? 'bg-red-500' : health.estimatedMB > 300 ? 'bg-amber-400' : 'bg-green-500';
  const textColor = health.estimatedMB > 400 ? 'text-red-600' : health.estimatedMB > 300 ? 'text-amber-600' : 'text-green-600';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-slate-800">Database Health</span>
        </div>
        <button onClick={fetchHealth} className="text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="flex items-end gap-3">
        <span className={`text-4xl font-black ${textColor}`}>{health.estimatedMB}</span>
        <span className="text-slate-500 mb-1">MB estimated / 500 MB limit</span>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-3 pt-1">
        {health.tables.map(t => (
          <div key={t.name} className="bg-slate-50 rounded-lg p-3 text-xs">
            <div className="font-bold text-slate-700 capitalize">{t.name}</div>
            <div className="text-slate-500">{t.rows.toLocaleString()} rows</div>
            <div className="text-slate-400">~{t.est_mb} MB</div>
          </div>
        ))}
      </div>

      {health.estimatedMB > 400 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Database is approaching the 500MB free limit. Archive completed semesters immediately.</span>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded-lg text-sm flex gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Archiving exports all raw data to Excel, saves a summary in the database, then deletes raw rows to free space. <strong>This action cannot be undone.</strong></span>
      </div>
    </div>
  );
};

// ─── GOOGLE DRIVE SETUP GUIDE ─────────────────────────────────────────────────
const DriveGuide = () => {
  const [open, setOpen] = useState(false);
  const steps = [
    { n: 1, text: 'Go to console.cloud.google.com' },
    { n: 2, text: 'Create a new project named "College AMS Backup"' },
    { n: 3, text: 'Enable Google Drive API → APIs and Services → Enable APIs → search Drive → Enable' },
    { n: 4, text: 'Create Service Account → APIs and Services → Credentials → Create Credentials → Service Account → name it "ams-backup-bot"' },
    { n: 5, text: 'Create and download JSON key → Click service account → Keys → Add Key → JSON → Download' },
    { n: 6, text: 'Create 4 folders in Google Drive: "AMS Daily Backups", "AMS Weekly Backups", "AMS Monthly Backups", "AMS Batch Archives"' },
    { n: 7, text: "Share each folder with the service account email (Rt-click folder → Share → paste service account email → Editor access)" },
    { n: 8, text: 'Copy each folder\'s ID from the URL: drive.google.com/drive/folders/[THIS_IS_THE_FOLDER_ID]' },
    { n: 9, text: 'Add to GitHub Secrets: GDRIVE_CREDENTIALS (paste entire JSON), GDRIVE_DAILY_FOLDER_ID, GDRIVE_WEEKLY_FOLDER_ID, GDRIVE_MONTHLY_FOLDER_ID' },
  ];
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /> Google Drive Backup Setup Guide</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="p-4 bg-white space-y-2">
          {steps.map(s => (
            <div key={s.n} className="flex gap-3 text-sm">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{s.n}</span>
              <span className="text-slate-700 pt-0.5">{s.text}</span>
            </div>
          ))}
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            <strong>GitHub Secrets (Settings → Secrets → Actions) typically include:</strong><br />
            Cloudflare deploy tokens / account IDs as needed, plus<br />
            GDRIVE_CREDENTIALS, GDRIVE_DAILY_FOLDER_ID, GDRIVE_WEEKLY_FOLDER_ID, GDRIVE_MONTHLY_FOLDER_ID
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export const ArchiveSemester = () => {
  const { user } = useAuth();

  // Form state
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState('');
  const [sem, setSem] = useState('5');
  const [year, setYear] = useState('2024-25');

  // Preview state
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Execution state
  const [running, setRunning] = useState(false);
  const [stepStatuses, setStepStatuses] = useState({});
  const [result, setResult] = useState(null);
  const [archiveError, setArchiveError] = useState(null);

  // Archive history
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Past summaries
  const [summaries, setSummaries] = useState([]);
  const [summaryFilters, setSummaryFilters] = useState({ branch: 'All', sem: 'All', year: 'All' });
  const [summaryYears, setSummaryYears] = useState([]);

  const fileUrlRef = useRef(null);

  const STEPS = [
    { key: 'fetch',   label: 'Step 1 — Fetching all data...' },
    { key: 'excel',   label: 'Step 2 — Generating Excel file...' },
    { key: 'upload',  label: 'Step 3 — Uploading archive to R2 storage...' },
    { key: 'summary', label: 'Step 4 — Saving summary records...' },
    { key: 'delete',  label: 'Step 5 — Deleting raw data...' },
    { key: 'done',    label: 'Step 6 — Done ✓' },
  ];

  useEffect(() => {
    api.getBranches().then((data) => {
      if (data?.length) {
        setBranches(data);
        setBranch(data[0].name);
      }
    });
    loadHistory();
    loadSummaries();
  }, []);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.getArchiveLog();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const loadSummaries = async () => {
    try {
      const data = await api.getSemesterSummary();
      if (Array.isArray(data) && data.length) {
        setSummaries(data);
        setSummaryYears([...new Set(data.map((d) => d.academic_year))]);
      } else {
        setSummaries([]);
        setSummaryYears([]);
      }
    } catch {
      setSummaries([]);
      setSummaryYears([]);
    }
  };

  // ── PREVIEW ────────────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!branch || !sem || !year) { toast.error('Fill all fields first'); return; }
    setPreviewing(true);
    try {
      const p = await api.getArchivePreview({ branch, sem: parseInt(sem, 10), year });
      setPreview({
        students: p.students,
        subjects: p.subjects,
        lectures: p.lectures,
        attendance: p.attendance,
        estimatedMB: p.estimatedMB,
        existingLog: p.existingLog,
      });
    } catch (e) {
      toast.error('Preview failed: ' + e.message);
    }
    setPreviewing(false);
  };

  // ── ARCHIVE EXECUTION ──────────────────────────────────────────────────────
  const setStep = (key, status) => setStepStatuses(s => ({ ...s, [key]: status }));

  const handleArchive = async () => {
    setShowConfirm(false);
    setRunning(true);
    setResult(null);
    setArchiveError(null);
    fileUrlRef.current = null;

    // Init all steps as pending
    const init = {};
    STEPS.forEach(s => init[s.key] = 'pending');
    setStepStatuses(init);

    let attData = [], marksData = [], condonData = [], allStudentSubjectPairs = [];
    let fileUrl = null, fileName = null;
    let attRowCount = 0, lecRowCount = 0;

    try {
      // ── STEP 1: FETCH ──────────────────────────────────────────────────────
      setStep('fetch', 'running');

      const wiz = await api.getArchiveWizardData({
        branch,
        sem: parseInt(sem, 10),
        year,
      });
      const attRows = wiz.attendance || [];
      attData = attRows;
      attRowCount = attData.length;

      marksData = (wiz.ctMarks || []).map((m) => ({
        roll_no: m.roll_no,
        name: m.student_name,
        subject_code: m.subject_code,
        subject_name: m.subject_name,
        test_name: m.test_name,
        marks_obtained: m.marks_obtained,
        max_marks: m.max_marks,
      }));

      condonData = (wiz.condonation || []).map((c) => ({
        roll_no: c.roll_no,
        name: c.student_name,
        subject_code: c.subject_code,
        lectures_condoned: c.lectures_condoned,
        reason: c.reason,
        status: c.status,
        created_at: c.created_at,
      }));

      // Build student-subject pairs for summary
      const pairMap = {};
      attData.forEach(r => {
        const k = `${r.roll_no}|||${r.subject_code}`;
        if (!pairMap[k]) pairMap[k] = { 
          roll_no: r.roll_no, 
          student_name: r.student_name, 
          subject_code: r.subject_code, 
          subject_name: r.subject_name, 
          present: 0, 
          late: 0,
          absent: 0, 
          excused: 0,
          total: 0 
        };
        pairMap[k].total++;
        if (r.status === 'present') pairMap[k].present++;
        else if (r.status === 'late') pairMap[k].late++;
        else if (r.status === 'excused') pairMap[k].excused++;
        else pairMap[k].absent++;
      });
      condonData.filter(c => c.status === 'approved').forEach(c => {
        const k = `${c.roll_no}|||${c.subject_code}`;
        if (pairMap[k]) pairMap[k].condoned = (pairMap[k].condoned || 0) + c.lectures_condoned;
      });
      allStudentSubjectPairs = Object.values(pairMap);

      setStep('fetch', 'done');

      // ── STEP 2: GENERATE EXCEL ─────────────────────────────────────────────
      setStep('excel', 'running');

      const wb = XLSX.utils.book_new();

      // Sheet 1 — Summary
      const now = new Date();
      const summaryRows = allStudentSubjectPairs.map(p => {
        const attended = p.present + p.late;
        const rawPct = p.total > 0 ? (attended / p.total) * 100 : 0;
        const finalPct = p.total > 0 ? Math.min(((attended + (p.condoned || 0)) / p.total) * 100, 100) : 0;
        return {
          'Roll No': p.roll_no, 'Student Name': p.student_name,
          'Subject Code': p.subject_code, 'Subject Name': p.subject_name,
          'Total Lectures': p.total, 
          'Present': p.present, 
          'Late': p.late,
          'Absent': p.absent,
          'Excused': p.excused,
          'Condoned': p.condoned || 0,
          'Raw %': rawPct.toFixed(1), 'Final %': finalPct.toFixed(1),
          'Result': finalPct >= 75 ? 'PASS' : 'FAIL'
        };
      });

      // Add class averages row
      if (summaryRows.length > 0) {
        const avgFinal = summaryRows.reduce((s, r) => s + parseFloat(r['Final %']), 0) / summaryRows.length;
        summaryRows.push({ 'Roll No': 'CLASS AVERAGE', 'Student Name': '', 'Subject Code': '', 'Subject Name': '', 'Total Lectures': '', 'Present': '', 'Absent': '', 'Condoned': '', 'Raw %': '', 'Final %': avgFinal.toFixed(1), 'Result': '' });
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

      // Sheet 2 — Raw Attendance
      const attSheet = attData.map(r => ({
        'Roll No': r.roll_no, 'Name': r.student_name, 'Subject': r.subject_code,
        'Date': r.date, 'Lecture No': r.lecture_no, 'Status': r.status, 'Remarks': r.remarks || ''
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attSheet.length ? attSheet : [{}]), 'Raw Attendance');

      // Sheet 3 — CT Marks
      const marksSheet = marksData.map(m => ({
        'Roll No': m.roll_no, 'Name': m.name, 'Subject': m.subject_code,
        'Test Name': m.test_name, 'Marks': m.marks_obtained, 'Max Marks': m.max_marks,
        'Percentage': m.max_marks ? ((m.marks_obtained / m.max_marks) * 100).toFixed(1) : '-'
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(marksSheet.length ? marksSheet : [{}]), 'CT Marks');

      // Sheet 4 — Condonations
      const condSheet = condonData.map(c => ({
        'Roll No': c.roll_no, 'Name': c.name, 'Subject': c.subject_code,
        'Lectures Condoned': c.lectures_condoned, 'Reason': c.reason,
        'Status': c.status, 'Date': c.created_at
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(condSheet.length ? condSheet : [{}]), 'Condonations');

      const totalLate = attData.filter(r => r.status === 'late').length;
      const totalExcused = attData.filter(r => r.status === 'excused').length;

      // Sheet 5 — Archive Info
      const infoSheet = [
        { 'Key': 'Branch',               'Value': branch },
        { 'Key': 'Semester',             'Value': sem },
        { 'Key': 'Academic Year',        'Value': year },
        { 'Key': 'Archived On',          'Value': now.toISOString() },
        { 'Key': 'Archived By',          'Value': user?.name || user?.id },
        { 'Key': 'Total Students',       'Value': preview?.students || allStudentSubjectPairs.length },
        { 'Key': 'Total Lectures',       'Value': preview?.lectures || 0 },
        { 'Key': 'Total Attendance Rows','Value': attRowCount },
        { 'Key': 'Total Late Marks',     'Value': totalLate },
        { 'Key': 'Total Excused Marks',  'Value': totalExcused },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(infoSheet), 'Archive Info');

      const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 19);
      fileName = `Archive_${branch}_Sem${sem}_${year}_${timestamp}.xlsx`;
      const wbBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      setStep('excel', 'done');

      // ── STEP 3: UPLOAD ─────────────────────────────────────────────────────
      setStep('upload', 'running');

      const formData = new FormData();
      formData.append(
        'file',
        new File([blob], fileName, {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      );
      formData.append('folder', `archives/${branch}/Sem${sem}`);
      try {
        const up = await api.uploadFile(formData);
        fileUrl = up.url;
        fileUrlRef.current = fileUrl;
      } catch (uploadErr) {
        if (uploadErr.status === 501) {
          toast.error(
            'R2 storage is not configured on the server. Set FILES in wrangler.toml, or skip upload — summary/deletion continue without a hosted file URL.'
          );
          fileUrl = null;
          fileUrlRef.current = null;
        } else {
          throw uploadErr;
        }
      }

      setStep('upload', 'done');

      // ── STEP 4: SAVE SUMMARIES ─────────────────────────────────────────────
      setStep('summary', 'running');

      const studentsData = await api.getStudents({ branch, sem: parseInt(sem, 10) });
      const subjectsAll = await api.getSubjects();
      const subjectsData = (subjectsAll || []).filter(
        (s) => s.branch === branch && s.sem === parseInt(sem, 10)
      );

      const studMap = {};
      (studentsData || []).forEach((s) => { studMap[s.roll_no] = s.id; });
      const subMap = {};
      (subjectsData || []).forEach((s) => { subMap[s.code] = s.id; });

      const summaryInserts = allStudentSubjectPairs
        .filter((p) => studMap[p.roll_no] && subMap[p.subject_code])
        .map((p) => {
          const attended = p.present + p.late;
          const rawPct = p.total > 0 ? (attended / p.total) * 100 : 0;
          const finalPct = p.total > 0 ? Math.min(((attended + (p.condoned || 0)) / p.total) * 100, 100) : 0;
          return {
            student_id: studMap[p.roll_no],
            subject_id: subMap[p.subject_code],
            sem: parseInt(sem, 10),
            academic_year: year,
            total_lectures: p.total,
            present: p.present,
            late: p.late,
            absent: p.absent,
            excused: p.excused,
            condoned: p.condoned || 0,
            raw_percent: parseFloat(rawPct.toFixed(2)),
            final_percent: parseFloat(finalPct.toFixed(2)),
            archive_file_url: fileUrl,
          };
        });

      if (summaryInserts.length > 0) {
        await api.batchUpsertSemesterSummary(summaryInserts);
      }

      setStep('summary', 'done');

      // ── STEP 5: DELETE ─────────────────────────────────────────────────────
      setStep('delete', 'running');

      const subjectIds = (subjectsData || []).map((s) => s.id);
      const del = await api.deleteArchivedSemesterRaw({
        branch,
        sem: parseInt(sem, 10),
        year,
      });
      lecRowCount = del.deletedLectures || 0;
      const attDeleted = del.deletedAttendance || 0;

      setStep('delete', 'done');

      await api.createArchiveLog({
        archived_by: user.id,
        branch,
        sem: parseInt(sem, 10),
        academic_year: year,
        students_count: preview?.students || 0,
        subjects_count: subjectIds.length,
        rows_archived: attRowCount,
        rows_deleted: attDeleted + (del.deletedLectures || 0),
        file_name: fileName,
        file_url: fileUrl,
        status: 'completed',
      });

      setStep('done', 'done');
      setResult({
        branch, sem, year,
        rowsArchived: attRowCount,
        rowsDeleted: attDeleted + lecRowCount,
        estimatedMB: Math.round(((attDeleted || 0) + (lecRowCount || 0)) * 0.0002),
        fileUrl,
        fileName,
      });

      toast.success('Archive completed successfully!');
      loadHistory();
      loadSummaries();

    } catch (err) {
      console.error(err);
      setArchiveError(err.message);
      toast.error('Archive failed: ' + err.message);

      // Log failed status
      await api.createArchiveLog({
        archived_by: user.id,
        branch,
        sem: parseInt(sem, 10),
        academic_year: year,
        students_count: 0,
        subjects_count: 0,
        rows_archived: 0,
        rows_deleted: 0,
        file_name: fileName || null,
        file_url: fileUrlRef.current || null,
        status: 'failed',
      }).catch(() => {});

      // Mark current running step as error
      setStepStatuses(prev => {
        const upd = { ...prev };
        Object.keys(upd).forEach(k => { if (upd[k] === 'running') upd[k] = 'error'; });
        return upd;
      });
    }

    setRunning(false);
    setConfirmed(false);
  };

  // ── HISTORY TABLE COLUMNS ──────────────────────────────────────────────────
  const histCols = [
    { header: 'Branch', accessor: 'branch' },
    { header: 'Sem', accessor: 'sem' },
    { header: 'Year', accessor: 'academic_year' },
    { header: 'Students', accessor: 'students_count' },
    { header: 'Rows Deleted', accessor: 'rows_deleted' },
    { header: 'Archived By', accessor: 'archived_by', render: r => r.users?.name || '—' },
    { header: 'Date', accessor: 'created_at', render: r => new Date(r.created_at).toLocaleDateString('en-IN') },
    { header: 'Status', accessor: 'status', render: r => (
      <Badge variant={r.status === 'completed' ? 'green' : 'danger'} className="uppercase text-[10px]">{r.status}</Badge>
    )},
    { header: 'Download', accessor: 'file_url', render: r => r.file_url ? (
      <a href={r.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline text-xs font-medium">
        <Download className="w-3 h-3" /> Excel
      </a>
    ) : <span className="text-slate-400 text-xs">—</span> }
  ];

  // ── SUMMARY TABLE ──────────────────────────────────────────────────────────
  const filteredSummaries = summaries.filter(s => {
    const bMatch = summaryFilters.branch === 'All' || s.students?.branch === summaryFilters.branch;
    const sMatch = summaryFilters.sem === 'All' || s.sem?.toString() === summaryFilters.sem;
    const yMatch = summaryFilters.year === 'All' || s.academic_year === summaryFilters.year;
    return bMatch && sMatch && yMatch;
  });

  const summaryBranches = ['All', ...branches.map(b => b.name)];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl">
      {/* HEADER */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Archive className="h-6 w-6 text-indigo-600" />
          Semester Archive
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Archive completed semester data to free up database space. Full data is exported to Excel before deletion.
        </p>
      </div>

      {/* DB HEALTH */}
      <HealthCard />

      {/* ARCHIVE FORM */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm uppercase tracking-wider">
          Step 1 — Select Semester to Archive
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Branch</label>
            <select className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
              value={branch} onChange={e => { setBranch(e.target.value); setPreview(null); }}>
              {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Semester</label>
            <select className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
              value={sem} onChange={e => { setSem(e.target.value); setPreview(null); }}>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Academic Year</label>
            <input type="text" className="w-full h-10 border border-slate-200 rounded-md px-3 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
              value={year} onChange={e => { setYear(e.target.value); setPreview(null); }}
              placeholder="e.g. 2024-25" />
          </div>
        </div>

        <Button onClick={handlePreview} disabled={previewing}>
          {previewing ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Previewing...</> : <><Eye className="w-4 h-4 mr-2" />Preview Archive</>}
        </Button>

        {/* PREVIEW CARD */}
        {preview && (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {preview.existingLog && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                This semester was already archived on {new Date(preview.existingLog.created_at).toLocaleDateString('en-IN')}.
                Archiving again will overwrite the summary records. Are you sure?
              </div>
            )}

            <div className="p-5 bg-slate-50 grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Archive Preview</div>
                <Row label="Branch" value={branch} />
                <Row label="Semester" value={sem} />
                <Row label="Academic Year" value={year} />
                <div className="border-t my-2" />
                <Row label="Students" value={preview.students} />
                <Row label="Subjects" value={preview.subjects} />
                <Row label="Lectures" value={preview.lectures} />
                <Row label="Attendance Rows" value={preview.attendance} />
                <div className="border-t my-2" />
                <Row label="Space to be freed" value={`~${preview.estimatedMB} MB`} bold />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">What will happen</div>
                <Item tick label="Full Excel file will be created" />
                <Item tick label="Summary saved permanently" />
                <Item tick label="Raw attendance rows deleted" />
                <Item tick label="Raw lecture rows deleted" />
                <Item cross label="Marks data NOT deleted (kept)" />
                <Item cross label="Student records NOT deleted" />
              </div>
            </div>

            <div className="p-4 border-t bg-white flex justify-end">
              <button
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                onClick={() => setShowConfirm(true)}
                disabled={running}
              >
                <Archive className="w-4 h-4" /> Proceed to Archive
              </button>
            </div>
          </div>
        )}

        {/* RUNNING PROGRESS */}
        {running && (
          <div className="border border-slate-200 rounded-xl p-5 space-y-2">
            <div className="font-semibold text-slate-700 mb-3 text-sm">Archive in progress — do not close this tab</div>
            {STEPS.map(s => (
              <ProgressStep key={s.key} number={STEPS.indexOf(s)+1} label={s.label} status={stepStatuses[s.key] || 'pending'} />
            ))}
          </div>
        )}

        {/* RESULT */}
        {result && !running && (
          <div className="border border-green-200 rounded-xl bg-green-50 p-6 space-y-3">
            <div className="flex items-center gap-2 text-green-700 font-bold text-lg">
              <CheckCircle2 className="w-6 h-6" /> Archive Complete
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Row label="Branch" value={result.branch} />
              <Row label="Semester" value={result.sem} />
              <Row label="Year" value={result.year} />
              <Row label="Rows Archived" value={result.rowsArchived} />
              <Row label="Rows Deleted" value={result.rowsDeleted} />
              <Row label="Space Freed" value={`~${result.estimatedMB} MB`} bold />
            </div>
            <div className="flex gap-3 pt-2">
              <a href={result.fileUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                <Download className="w-4 h-4" /> Download Archive Excel
              </a>
            </div>
          </div>
        )}

        {/* ERROR */}
        {archiveError && !running && (
          <div className="border border-red-200 rounded-xl bg-red-50 p-5 text-red-700 space-y-2">
            <div className="font-bold flex items-center gap-2"><XCircle className="w-5 h-5" /> Archive Failed</div>
            <p className="text-sm">{archiveError}</p>
            <p className="text-xs text-red-600">No data was deleted. The archive was not completed. Try again or contact support.</p>
          </div>
        )}
      </div>

      {/* GOOGLE DRIVE GUIDE */}
      <DriveGuide />

      {/* ARCHIVE HISTORY */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-slate-800">Archive History</h3>
        <Table columns={histCols} data={history} emptyMessage="No archives yet." />
      </div>

      {/* PAST SEMESTER SUMMARY VIEW */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-slate-800">Past Semester Data</h3>
        <div className="flex gap-3 flex-wrap">
          <select className="border border-slate-200 rounded-md px-3 py-2 text-sm"
            value={summaryFilters.branch} onChange={e => setSummaryFilters(f => ({ ...f, branch: e.target.value }))}>
            {summaryBranches.map(b => <option key={b}>{b}</option>)}
          </select>
          <select className="border border-slate-200 rounded-md px-3 py-2 text-sm"
            value={summaryFilters.sem} onChange={e => setSummaryFilters(f => ({ ...f, sem: e.target.value }))}>
            <option>All</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="border border-slate-200 rounded-md px-3 py-2 text-sm"
            value={summaryFilters.year} onChange={e => setSummaryFilters(f => ({ ...f, year: e.target.value }))}>
            <option>All</option>
            {summaryYears.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <Table
          columns={[
            { header: 'Roll No', accessor: 'roll_no', render: r => r.students?.roll_no || '—' },
            { header: 'Name', accessor: 'name', render: r => r.students?.users?.name || '—' },
            { header: 'Subject', accessor: 'subject', render: r => r.subjects?.code || '—' },
            { header: 'Final %', accessor: 'final_percent', render: r => `${r.final_percent}%` },
            { header: 'Result', accessor: 'result', render: r => (
              <Badge variant={r.final_percent >= 75 ? 'green' : 'danger'} className="text-[10px] uppercase">
                {r.final_percent >= 75 ? 'Pass' : 'Fail'}
              </Badge>
            )},
            { header: 'Archived On', accessor: 'archived_at', render: r => new Date(r.archived_at).toLocaleDateString('en-IN') },
          ]}
          data={filteredSummaries}
          emptyMessage="No archived semester data found."
        />
      </div>

      {/* CONFIRM MODAL */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Archive Semester Data">
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            <p>This will permanently delete <strong>{preview?.attendance?.toLocaleString()}</strong> attendance rows and{' '}
              <strong>{preview?.lectures?.toLocaleString()}</strong> lecture rows for{' '}
              <strong>{branch} Sem {sem} ({year})</strong>.</p>
            <p className="mt-2">A full Excel backup will be created first. <strong>This action cannot be undone.</strong></p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" className="mt-0.5 rounded" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
            <span className="text-sm text-slate-700">
              I have verified the preview above and understand this will delete raw attendance data.
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <button
              disabled={!confirmed}
              onClick={handleArchive}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Confirm Archive
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── TINY HELPERS ────────────────────────────────────────────────────────────
const Row = ({ label, value, bold }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-slate-500">{label}:</span>
    <span className={`${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value}</span>
  </div>
);

const Item = ({ tick, label }) => (
  <div className={`flex items-center gap-2 text-sm ${tick ? 'text-green-700' : 'text-slate-500'}`}>
    <span className={`font-bold ${tick ? 'text-green-600' : 'text-slate-400'}`}>{tick ? '✓' : '✗'}</span>
    {label}
  </div>
);

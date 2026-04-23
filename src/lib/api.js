/**
 * API client for Cloudflare Worker + D1 (cookie session).
 */
const BASE = '';

async function request(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(data?.error || data?.message || res.statusText || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function authLogin(collegeId, password) {
  return request('/api/auth/login', { method: 'POST', body: { college_id: collegeId, password } });
}

export async function authLogout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export async function authMe() {
  return request('/api/auth/me');
}

export async function getBranches() {
  return request('/api/branches');
}

export async function createBranch(body) {
  return request('/api/branches', { method: 'POST', body });
}

export async function deleteBranch(id) {
  return request(`/api/branches/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getUsers() {
  return request('/api/users');
}

export async function createUser(body) {
  return request('/api/admin/users', { method: 'POST', body });
}

export async function bulkUpsertUser(body) {
  return request('/api/admin/bulk-upsert-user', { method: 'POST', body });
}

export async function createArchiveLog(body) {
  return request('/api/archive_log', { method: 'POST', body });
}

export async function updateUser(uid, body) {
  return request(`/api/users/${encodeURIComponent(uid)}`, { method: 'PATCH', body });
}

export async function deleteUser(uid) {
  return request(`/api/users/${encodeURIComponent(uid)}`, { method: 'DELETE' });
}

export async function getDeletedUsers() {
  return request('/api/users?deleted=1');
}

export async function updateStudentByUserId(userId, body) {
  return request(`/api/students/by-user/${encodeURIComponent(userId)}`, { method: 'PATCH', body });
}

export async function getStudents(qs = {}) {
  const p = new URLSearchParams(qs);
  const s = p.toString();
  return request(s ? `/api/students?${s}` : '/api/students');
}

export async function getStudentsWithUsers(qs) {
  const p = new URLSearchParams(qs);
  return request(`/api/students-with-users?${p}`);
}

export async function getSubjects() {
  return request('/api/subjects');
}

export async function createSubject(body) {
  return request('/api/subjects', { method: 'POST', body });
}

export async function deleteSubject(id) {
  return request(`/api/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getSubjectAssignments(params = {}) {
  const p = new URLSearchParams(params);
  return request(`/api/subject-assignments?${p}`);
}

export async function upsertSubjectAssignment(body) {
  return request('/api/subject-assignments', { method: 'POST', body });
}

export async function deleteSubjectAssignment(id) {
  return request(`/api/subject-assignments/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getSystemConfig() {
  return request('/api/system_config');
}

export async function getSystemConfigKey(key) {
  return request(`/api/system_config/${encodeURIComponent(key)}`);
}

export async function putSystemConfig(body) {
  return request('/api/system_config', { method: 'PUT', body });
}

export async function deleteSystemConfigKey(key) {
  return request(`/api/system_config/${encodeURIComponent(key)}`, { method: 'DELETE' });
}

export async function getLectures(qs = {}) {
  const p = new URLSearchParams(qs);
  return request(`/api/lectures?${p}`);
}

export async function getLecturesForBranch(branch, sem) {
  return request(`/api/lectures/for-branch?branch=${encodeURIComponent(branch)}&sem=${sem}`);
}

export async function getLecturesCount(qs) {
  const p = new URLSearchParams(qs);
  return request(`/api/lectures/count?${p}`);
}

export async function createLecture(body) {
  return request('/api/lectures', { method: 'POST', body });
}

export async function findLecture(qs) {
  const p = new URLSearchParams(qs);
  return request(`/api/lectures/find?${p}`);
}

export async function getAttendance(qs = {}) {
  const p = new URLSearchParams(qs);
  return request(`/api/attendance?${p}`);
}

export async function insertAttendance(rows) {
  return request('/api/attendance', { method: 'POST', body: { rows } });
}

export async function patchAttendanceRow(body) {
  return request('/api/attendance', { method: 'PATCH', body });
}

export async function getNotices() {
  return request('/api/notices');
}

export async function createNotice(body) {
  return request('/api/notices', { method: 'POST', body });
}

export async function patchNotice(id, body) {
  return request(`/api/notices/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export async function deleteNotice(id) {
  return request(`/api/notices/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getHolidays() {
  return request('/api/holidays');
}

export async function createHoliday(body) {
  return request('/api/holidays', { method: 'POST', body });
}

export async function deleteHoliday(id) {
  return request(`/api/holidays/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getTimetable(qs) {
  const p = new URLSearchParams(qs);
  return request(`/api/timetable?${p}`);
}

export async function upsertTimetableSlot(body) {
  return request('/api/timetable', { method: 'POST', body });
}

export async function batchUpsertTimetable(body) {
  return request('/api/timetable/batch', { method: 'POST', body });
}


export async function getTimetableChangeLog(branch, sem) {
  return request(`/api/timetable_change_log?branch=${encodeURIComponent(branch)}&sem=${sem}`);
}

export async function insertTimetableChangeLog(body) {
  return request('/api/timetable_change_log', { method: 'POST', body });
}

export async function getSubstituteLog(qs = {}) {
  const p = new URLSearchParams(qs);
  return request(`/api/substitute_log?${p}`);
}

export async function createSubstituteLog(body) {
  return request('/api/substitute_log', { method: 'POST', body });
}

export async function patchSubstituteLog(id, body) {
  return request(`/api/substitute_log/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export async function getLeaveRequests(qs = {}) {
  const p = new URLSearchParams(qs);
  return request(`/api/leave_requests?${p}`);
}

export async function getLeaveRequestsCount(qs) {
  const p = new URLSearchParams(qs);
  return request(`/api/leave_requests/count?${p}`);
}

export async function createLeaveRequest(body) {
  return request('/api/leave_requests', { method: 'POST', body });
}

export async function patchLeaveRequest(id, body) {
  return request(`/api/leave_requests/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export async function getAttendanceChangeRequests() {
  return request('/api/attendance_change_requests');
}

export async function patchAttendanceChangeRequest(id, body) {
  return request(`/api/attendance_change_requests/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export async function getAttendanceCondonation(qs = {}) {
  const p = new URLSearchParams(qs);
  return request(`/api/attendance_condonation?${p}`);
}

export async function createAttendanceCondonation(body) {
  return request('/api/attendance_condonation', { method: 'POST', body });
}

export async function patchAttendanceCondonation(id, body) {
  return request(`/api/attendance_condonation/${encodeURIComponent(id)}`, { method: 'PATCH', body });
}

export async function getCtMarks(qs = {}) {
  const p = new URLSearchParams(qs);
  return request(`/api/ct_marks?${p}`);
}

export async function upsertCtMarks(rows) {
  return request('/api/ct_marks/upsert', { method: 'POST', body: { rows } });
}

export async function getEndsemMarks(qs = {}) {
  const p = new URLSearchParams(qs);
  return request(`/api/endsem_marks?${p}`);
}

export async function patchEndsemMarks(body) {
  return request('/api/endsem_marks', { method: 'PATCH', body });
}

export async function createEndsemMark(body) {
  return request('/api/endsem_marks', { method: 'POST', body });
}

export async function getTeachers(excludeId) {
  return request(`/api/teachers?exclude=${encodeURIComponent(excludeId || '')}`);
}

export async function getCount(table) {
  return request(`/api/count/${encodeURIComponent(table)}`);
}

export async function createBulkUploadLog(body) {
  return request('/api/bulk_upload_logs', { method: 'POST', body });
}

export async function getBulkUploadLogs(limit = 20, type = '') {
  const q = type ? `&type=${encodeURIComponent(type)}` : '';
  return request(`/api/bulk_upload_logs?limit=${limit}${q}`);
}

export async function getAdminSummary() {
  return request('/api/stats/admin-summary');
}

export async function getHodSummary() {
  return request('/api/stats/hod-summary');
}

export async function createSemesterTransition(body) {
  return request('/api/semester_transitions', { method: 'POST', body });
}

export async function getSemesterTransitions() {
  return request('/api/semester_transitions');
}

export async function promoteSemesterBatch(body) {
  return request('/api/admin/promote-semester', { method: 'POST', body });
}

export async function getArchiveLog() {
  return request('/api/archive_log');
}

export async function getSemesterSummary() {
  return request('/api/semester_summary');
}

export async function getArchivePreview({ branch, sem, year }) {
  const p = new URLSearchParams({ branch, sem: String(sem), year });
  return request(`/api/archive/preview?${p}`);
}

export async function getArchiveWizardData({ branch, sem, year }) {
  const p = new URLSearchParams({ branch, sem: String(sem), year });
  return request(`/api/archive/wizard-data?${p}`);
}

export async function batchUpsertSemesterSummary(rows) {
  return request('/api/archive/semester_summary/batch', { method: 'POST', body: { rows } });
}

export async function deleteArchivedSemesterRaw({ branch, sem, year }) {
  return request('/api/archive/delete-raw', { method: 'POST', body: { branch, sem, year } });
}

export async function getDbHealthStats() {
  return request('/api/health/db-stats');
}

export async function getStudentForUser(userId) {
  return request(`/api/student/for-user/${encodeURIComponent(userId)}`);
}

export async function uploadFile(formData) {
  return request('/api/upload', { method: 'POST', body: formData });
}

export async function patchEndsemGroup(body) {
  return request('/api/endsem_marks/group', { method: 'PATCH', body });
}

export async function initializeEndsemPoll(body) {
  return request('/api/endsem_marks/initialize', { method: 'POST', body });
}

export const clearTimetable = (branch, sem) => request('/api/timetable/clear', { method: 'POST', body: { branch, sem } });

export const approveLecture = (id) => request(`/api/lectures/approve/${id}`, { method: 'POST' });
export const rejectLecture = (id) => request(`/api/lectures/reject/${id}`, { method: 'POST' });
export const getPendingProxyLectures = () => request('/api/lectures/pending-proxy');
export const getManualInit = (qs) => request(`/api/manual-attendance-init?${new URLSearchParams(qs)}`);
export const saveManualInit = (body) => request('/api/manual-attendance-init', { method: 'POST', body });
export const resetAttendance = () => request('/api/maintenance/reset-attendance', { method: 'POST' });

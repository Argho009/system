export const validateUserUploadRow = (row) => {
  const errors = [];
  if (!row.college_id) errors.push("Missing college_id");
  if (!row.name) errors.push("Missing name");
  if (!row.role || !['admin', 'hod', 'teacher', 'student'].includes(row.role.toLowerCase())) {
    errors.push("Invalid or missing role");
  }
  if (row.role?.toLowerCase() === 'student') {
    if (!row.roll_no) errors.push("Missing roll_no for student");
    if (!row.branch) errors.push("Missing branch for student");
    if (!row.sem) errors.push("Missing sem for student");
  }
  return errors;
};

export const validateMarksUploadRow = (row) => {
  const errors = [];
  if (!row.roll_no) errors.push("Missing roll_no");
  if (row.marks === undefined || row.marks === null || isNaN(row.marks)) {
    errors.push("Missing or invalid marks");
  }
  return errors;
};

export const validateAttendanceUploadRow = (row, blankMeans) => {
  const errors = [];
  if (!row.roll_no) errors.push("Missing roll_no");
  
  if (row.status !== undefined && row.status !== null) {
    const s = row.status.toString().toLowerCase().trim();
    if (s !== 'p' && s !== 'a' && s !== '') {
      errors.push(`Invalid status '${row.status}'. Use P, A, or leave blank.`);
    }
  }
  return errors;
};

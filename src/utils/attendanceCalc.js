export const rawPercent = (present, late, total) => {
  if (total === 0) return 0;
  const attended = (present || 0) + (late || 0);
  return Number(((attended / total) * 100).toFixed(2));
};

export const finalPercent = (present, late, condoned, total) => {
  if (total === 0) return 0;
  const attended = (present || 0) + (late || 0);
  const absent = total - attended;
  const validCondoned = Math.min(condoned || 0, absent);
  
  const pct = ((attended + validCondoned) / total) * 100;
  return Number(Math.min(100, pct).toFixed(2));
};

export const isLowAttendance = (finalPct) => {
  return finalPct < 75;
};

export const colorForPercent = (pct) => {
  if (pct >= 75) return 'text-green-600 bg-green-50';
  if (pct >= 65) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

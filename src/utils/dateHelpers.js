export const semToYear = (sem) => {
  if (sem <= 2) return 1;
  if (sem <= 4) return 2;
  if (sem <= 6) return 3;
  return 4;
};

export const isWithin3Days = (lectureDateStr) => {
  const lectureDate = new Date(lectureDateStr);
  const now = new Date();
  
  // Ignore time component for date diff
  lectureDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(now - lectureDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  return diffDays <= 3;
};

export const academicYearFromDate = (date = new Date()) => {
  const month = date.getMonth(); // 0 is Jan
  const year = date.getFullYear();
  
  // If month is before July, we say academic year is previous Year - current Year
  if (month < 6) {
    return `${year - 1}-${year.toString().slice(2)}`;
  } else {
    return `${year}-${(year + 1).toString().slice(2)}`;
  }
};

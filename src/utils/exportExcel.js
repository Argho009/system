import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportToExcel = (sheets, filename) => {
  const wb = XLSX.utils.book_new();
  
  for (const sheet of sheets) {
    const ws = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(data, `${filename}.xlsx`);
};



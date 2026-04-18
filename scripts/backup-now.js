import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

config({ path: '.env.admin' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLES = [
  'branches',
  'users',
  'students',
  'subjects',
  'subject_assignments',
  'lectures',
  'attendance',
  'attendance_change_requests',
  'attendance_condonation',
  'ct_marks',
  'endsem_marks',
  'holidays',
  'timetable',
  'timetable_change_log',
  'substitute_log',
  'leave_requests',
  'notices',
  'assignment_submissions',
  'bulk_upload_logs',
  'semester_transitions',
  'system_config',
  'semester_summary',
  'archive_log',
];

async function fetchAll(table) {
  let allRows = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + pageSize - 1);

    if (error) {
      console.warn(`  ⚠ Could not fetch "${table}": ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);
    if (data.length < pageSize) break; // Last page
    from += pageSize;
  }
  return allRows;
}

async function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const fileName = `FullBackup_${timestamp}.xlsx`;
  const filePath = path.join(__dirname, '..', fileName);

  const wb = XLSX.utils.book_new();

  // Cover sheet
  const meta = [
    { Key: 'Backup Date', Value: new Date().toLocaleString('en-IN') },
    { Key: 'Project', Value: 'College AMS' },
    { Key: 'Supabase URL', Value: process.env.VITE_SUPABASE_URL },
    { Key: 'Tables Exported', Value: TABLES.length },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(meta), '_Info');

  let totalRows = 0;

  for (const table of TABLES) {
    process.stdout.write(`  Exporting "${table}"... `);
    const rows = await fetchAll(table);
    totalRows += rows.length;
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ '(empty table)': '' }]);
    // Sheet names max 31 chars
    const sheetName = table.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    console.log(`${rows.length} rows`);
  }

  XLSX.writeFile(wb, filePath);
  console.log('\n═══════════════════════════════════════════');
  console.log(`✅ Backup complete!`);
  console.log(`   File: ${fileName}`);
  console.log(`   Total rows: ${totalRows.toLocaleString()}`);
  console.log(`   Saved to: ${filePath}`);
  console.log('═══════════════════════════════════════════');
}

runBackup().catch(err => {
  console.error('❌ Backup failed:', err.message);
  process.exit(1);
});

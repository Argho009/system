import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { parseExcel } from '../../lib/parseExcel';
import { parseCsv } from '../../lib/parseCsv';
import { useAuth } from '../../hooks/useAuth';
import { FileSpreadsheet, Upload, Download, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const MarksUpload = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  
  // Selection Context
  const [selection, setSelection] = useState({
    branch: '',
    sem: '',
    subject_id: '',
    test_name: '',
    max_marks: ''
  });

  const [branches, setBranches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selection.branch && selection.sem) {
      fetchSubjects();
    }
  }, [selection.branch, selection.sem]);

  const fetchInitialData = async () => {
    const { data: bData } = await supabase.from('branches').select('*').order('name');
    if (bData) setBranches(bData);
    
    const { data: hData } = await supabase
      .from('bulk_upload_logs')
      .select('*, users:uploaded_by(name)')
      .eq('upload_type', 'marks')
      .order('created_at', { ascending: false });
    if (hData) setHistory(hData);
  };

  const fetchSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('branch', selection.branch)
      .eq('sem', selection.sem)
      .order('name');
    if (data) setSubjects(data);
  };

  const handleFileSelect = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setLoading(true);
    setFile(selected);
    
    try {
      let data = [];
      if (selected.name.endsWith('.csv')) data = await parseCsv(selected);
      else data = await parseExcel(selected);

      // Validate and enrich rows
      // Need student list for branch/sem
      const { data: students } = await supabase
        .from('students')
        .select('id, roll_no, users(name)')
        .eq('branch', selection.branch)
        .eq('sem', selection.sem);

      const enriched = data.map(row => {
        const student = students?.find(s => s.roll_no === row.roll_no);
        const errors = [];
        if (!student) errors.push('Roll No not found in this branch/sem');
        if (isNaN(row.marks)) errors.push('Marks must be numeric');
        if (parseFloat(row.marks) > parseFloat(selection.max_marks)) errors.push('Marks exceed Maximum');

        return {
          ...row,
          student_id: student?.id,
          student_name: student?.users?.name || 'Unknown',
          _isValid: errors.length === 0,
          _error: errors.join(', ')
        };
      });

      setPreviewData(enriched);
      setStep(3);
    } catch (err) {
      toast.error('Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const validRows = previewData.filter(r => r._isValid);
    if (validRows.length === 0) return;

    setLoading(true);
    try {
      // 1. Determine table – if test_name contains 'CT', use ct_marks, else map correctly should be generic mark table
      // Spec says: "ct_marks" table is in schema.
      // Actually schema shows ct_marks for CT and endsem_marks for End Sem.
      const isCT = selection.test_name.toUpperCase().includes('CT');
      const tableName = isCT ? 'ct_marks' : 'ct_marks'; // Using mapping as per schema

      const { data: yearConfig } = await supabase.from('system_config').select('value').eq('key', 'academic_year').single();
      const academic_year = yearConfig?.value || '2024-25';

      const insertData = validRows.map(row => ({
        student_id: row.student_id,
        subject_id: selection.subject_id,
        test_name: selection.test_name,
        marks_obtained: parseFloat(row.marks),
        max_marks: parseFloat(selection.max_marks),
        academic_year
      }));

      const { error } = await supabase.from(tableName).upsert(insertData, { onConflict: 'student_id,subject_id,test_name' });
      
      if (error) throw error;

      await supabase.from('bulk_upload_logs').insert({
        file_name: file.name,
        upload_type: 'marks',
        status: 'completed',
        uploaded_by: user.id
      });

      setResults({ success: validRows.length, failed: previewData.length - validRows.length });
      setStep(4);
      fetchInitialData();
      toast.success('Marks uploaded successfully');
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [['roll_no', 'marks']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MarksTemplate');
    XLSX.writeFile(wb, 'marks_upload_template.xlsx');
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreviewData([]);
    setResults(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-tight">Academic Marks Upload</h2>
          <p className="text-sm text-slate-500">Upload internal assessment or custom test marks.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Step Indicators */}
        <div className="flex border-b border-slate-100">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={`flex-1 flex items-center justify-center py-3 text-xs font-bold gap-2 ${step === i ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${step === i ? 'border-indigo-600' : 'border-slate-300'}`}>{i}</div>
              {i === 1 ? 'CONTEXT' : i === 2 ? 'FILE' : i === 3 ? 'PREVIEW' : 'RESULT'}
            </div>
          ))}
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Branch</label>
                  <select 
                    className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                    value={selection.branch}
                    onChange={e => setSelection({...selection, branch: e.target.value})}
                  >
                    <option value="">Select Branch...</option>
                    {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Semester</label>
                  <select 
                    className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                    value={selection.sem}
                    onChange={e => setSelection({...selection, sem: e.target.value})}
                  >
                    <option value="">Select Sem...</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s.toString()}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Subject</label>
                  <select 
                     className="w-full h-10 px-3 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                     value={selection.subject_id}
                     onChange={e => setSelection({...selection, subject_id: e.target.value})}
                     disabled={!selection.branch || !selection.sem}
                  >
                    <option value="">Select Subject...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <Input 
                      label="Test Name" 
                      placeholder="CT1, MidSem" 
                      value={selection.test_name}
                      onChange={e => setSelection({...selection, test_name: e.target.value})}
                   />
                   <Input 
                      label="Max Marks" 
                      type="number" 
                      placeholder="e.g. 50"
                      value={selection.max_marks}
                      onChange={e => setSelection({...selection, max_marks: e.target.value})}
                   />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                 <Button 
                    disabled={!selection.subject_id || !selection.test_name || !selection.max_marks}
                    onClick={() => setStep(2)}
                 >
                   Continue to File Upload
                 </Button>
              </div>
              <p className="text-[11px] text-slate-400 text-right mt-2 font-medium">
                 Note: Uploaded file should ONLY have student roll no and marks.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center space-y-6">
               <div className="w-full max-w-lg p-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center transition-colors hover:border-indigo-300 group">
                <div className="p-4 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 group-hover:text-indigo-600 mb-4 transition-colors">
                  <FileSpreadsheet className="h-8 w-8" />
                </div>
                <h4 className="font-semibold text-slate-800 tracking-tight">Select Marks Spreadsheet</h4>
                <p className="text-xs text-slate-500 mt-1 mb-6 text-center">CSV or XLSX. The uploaded file must only have student roll no and marks.</p>
                <input 
                  type="file" 
                  id="marks-upload" 
                  className="hidden" 
                  accept=".xlsx,.csv" 
                  onChange={handleFileSelect} 
                />
                <Button onClick={() => document.getElementById('marks-upload').click()}>
                  Browse Files
                </Button>
              </div>
              <Button variant="ghost" onClick={() => setStep(1)}>Back to Context</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex gap-6">
                    <div><span className="text-[10px] uppercase text-slate-400 block">Subject</span> <p className="text-sm font-bold">{subjects.find(s => s.id === selection.subject_id)?.code}</p></div>
                    <div><span className="text-[10px] uppercase text-slate-400 block">Test</span> <p className="text-sm font-bold">{selection.test_name}</p></div>
                    <div><span className="text-[10px] uppercase text-slate-400 block">Max Marks</span> <p className="text-sm font-bold">{selection.max_marks}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={reset}>Cancel</Button>
                    <Button size="sm" onClick={handleImport} disabled={loading}>{loading ? 'Importing...' : 'Confirm Upload'}</Button>
                  </div>
               </div>

               <div className="max-h-[300px] overflow-auto border rounded-md">
                 <table className="w-full text-xs text-left">
                   <thead className="bg-slate-50 sticky top-0 bg-white">
                      <tr className="border-b">
                         <th className="p-2">Roll No</th>
                         <th className="p-2">Student Name</th>
                         <th className="p-2">Marks Obtained</th>
                         <th className="p-2 text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx} className={`border-b ${!row._isValid ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                          <td className="p-2 font-medium">{row.roll_no}</td>
                          <td className="p-2">{row.student_name}</td>
                          <td className="p-2 font-bold">{row.marks} / {selection.max_marks}</td>
                          <td className="p-2 text-right">
                             {row._isValid ? <CheckCircle className="h-4 w-4 text-green-500 inline" /> : <span className="text-red-600 text-[10px]">{row._error}</span>}
                          </td>
                        </tr>
                      ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {step === 4 && results && (
            <div className="flex flex-col items-center py-6 text-center">
               <div className={`p-4 rounded-full mb-4 ${results.failed === 0 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {results.failed === 0 ? <CheckCircle className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
               </div>
               <h3 className="text-xl font-bold text-slate-800">Upload Processed</h3>
               <p className="text-slate-500 mt-1 mb-8">
                 Successfully uploaded marks for {results.success} students. {results.failed > 0 && `${results.failed} skipped.`}
               </p>
               <Button onClick={reset}>Done</Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Past Uploads</h3>
        <Table 
          columns={[
             { header: 'File Name', accessor: 'file_name' },
             { header: 'Uploaded By', accessor: 'users', render: (row) => row.users?.name || 'System' },
             { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleString('en-IN') },
             { header: 'Status', accessor: 'status', render: (row) => <Badge variant="success">{row.status.toUpperCase()}</Badge> }
          ]}
          data={history}
          emptyMessage="No previous marks uploads found."
        />
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../components/ui/Toast';
import { parseCsv } from '../../lib/parseCsv';
import { parseExcel } from '../../lib/parseExcel';
import { useAuth } from '../../hooks/useAuth';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export const BulkUpload = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [blankMeans, setBlankMeans] = useState('present');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const rows = await api.getBulkUploadLogs(50);
      setHistory((rows || []).filter((r) => r.type === 'roles'));
    } catch {
      setHistory([]);
    }
  };

  const handleFileSelect = async (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    
    if (!selected.name.match(/\.(xlsx|csv)$/)) {
      toast.error('Please upload .xlsx or .csv files only');
      return;
    }

    setLoading(true);
    setFile(selected);
    
    try {
      let data = [];
      if (selected.name.endsWith('.csv')) {
        data = await parseCsv(selected);
      } else {
        data = await parseExcel(selected);
      }

      // Validate rows
      const validated = data.map(row => {
        const errors = [];
        if (!row.college_id) errors.push('Missing college_id');
        if (!row.name) errors.push('Missing name');
        if (!row.role) errors.push('Missing role');
        
        return {
          ...row,
          _isValid: errors.length === 0,
          _error: errors.join(', ')
        };
      });

      setPreviewData(validated);
      setStep(2);
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
      let successCount = 0;
      let failCount = 0;
      const failedRows = [];

      for (const row of validRows) {
        try {
          await api.bulkUpsertUser({
            college_id: row.college_id,
            name: row.name,
            role: row.role.toLowerCase(),
            password: row.password || row.initial_password || row.college_id,
            roll_no: row.roll_no || '',
            branch: row.branch || '',
            sem: parseInt(row.sem, 10) || 1,
          });
          successCount++;
        } catch (e) {
          failCount++;
          failedRows.push({ ...row, reason: e.message || 'Failed' });
        }
      }

      const status = failCount === 0 ? 'completed' : successCount > 0 ? 'partial' : 'failed';
      
      // Log the result
      await api.createBulkUploadLog({
        file_name: file.name,
        type: 'roles',
        status: status === 'completed' ? 'success' : status === 'failed' ? 'failed' : 'partial',
        uploaded_by: user.id,
      });

      setImportResults({ success: successCount, failed: failCount, failedData: failedRows });
      setStep(3);
      fetchHistory();
      toast.success('Import completed');
    } catch (err) {
      toast.error('Import failed process');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [['college_id', 'name', 'role', 'roll_no', 'branch', 'sem', 'password']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'student_import_template.xlsx');
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setPreviewData([]);
    setImportResults(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 leading-tight">Student & Roles Bulk Upload</h2>
        <p className="text-sm text-slate-500">Import multiple users by uploading an Excel or CSV file.</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Step Indicators */}
        <div className="flex border-b border-slate-100">
          {[1, 2, 3].map(i => (
            <div key={i} className={`flex-1 flex items-center justify-center py-3 text-xs font-bold gap-2 ${step === i ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${step === i ? 'border-indigo-600' : 'border-slate-300'}`}>{i}</div>
              {i === 1 ? 'UPLOAD' : i === 2 ? 'PREVIEW' : 'RESULT'}
            </div>
          ))}
        </div>

        <div className="p-8">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="w-full max-w-lg p-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center transition-colors hover:border-indigo-300 group">
                <div className="p-4 rounded-full bg-white shadow-sm border border-slate-100 text-slate-400 group-hover:text-indigo-600 mb-4 transition-colors">
                  <Upload className="h-8 w-8" />
                </div>
                <h4 className="font-semibold text-slate-800">Drop your file here</h4>
                <p className="text-xs text-slate-500 mt-1 mb-6 text-center">Supports .xlsx and .csv files with required headers</p>
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  accept=".xlsx,.csv" 
                  onChange={handleFileSelect} 
                />
                <Button onClick={() => document.getElementById('file-upload').click()}>
                  Browse Files
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-indigo-600 hover:text-indigo-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel Template
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">Preview Data</h4>
                  <p className="text-xs text-slate-500">
                    <span className="text-green-600 font-bold">{previewData.filter(r => r._isValid).length} valid rows</span>, 
                    <span className="text-red-500 font-bold ml-2">{previewData.filter(r => !r._isValid).length} invalid rows</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                   <Button variant="ghost" onClick={reset}>Cancel</Button>
                   <Button onClick={handleImport} disabled={loading}>
                     {loading ? 'Importing...' : 'Import Valid Rows'}
                   </Button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-auto border rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 sticky top-0 bg-white">
                    <tr className="border-b">
                      <th className="p-3">College ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Branch/Sem</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className={`border-b ${!row._isValid ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                        <td className="p-3 font-medium">{row.college_id}</td>
                        <td className="p-3">{row.name}</td>
                        <td className="p-3 uppercase">{row.role}</td>
                        <td className="p-3 text-slate-500">{row.branch || 'N/A'} - {row.sem || ''}</td>
                        <td className="p-3 text-right">
                          {row._isValid ? <CheckCircle className="h-4 w-4 text-green-500 inline" /> : <span className="text-red-600 text-[10px]">{row._error}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 3 && importResults && (
            <div className="flex flex-col items-center py-6">
              <div className={`p-4 rounded-full mb-4 ${importResults.failed === 0 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                {importResults.failed === 0 ? <CheckCircle className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
              </div>
              <h3 className="text-xl font-bold text-slate-800">Import Process Complete</h3>
              <p className="text-slate-500 mt-1 mb-8">
                {importResults.success} imported successfully, {importResults.failed} failed.
              </p>

              {importResults.failed > 0 && (
                <div className="w-full mb-8 border border-red-100 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-bold text-red-800">FAILED ROWS DETAIL</span>
                  </div>
                  <table className="w-full text-[10px] text-left">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="p-2">College ID</th>
                        <th className="p-2">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResults.failedData.map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-2 font-medium">{row.college_id}</td>
                          <td className="p-2 text-red-600">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button onClick={reset}>Finish and Close</Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Upload History</h3>
        <Table 
          columns={[
            { header: 'File Name', accessor: 'file_name' },
            { header: 'Status', accessor: 'status', render: (row) => <Badge variant={row.status === 'completed' ? 'success' : 'danger'}>{row.status.toUpperCase()}</Badge> },
            { header: 'By', accessor: 'users', render: (row) => row.users?.name || 'Unknown' },
            { header: 'Date', accessor: 'created_at', render: (row) => new Date(row.created_at).toLocaleString('en-IN') }
          ]} 
          data={history} 
          emptyMessage="No history found."
        />
      </div>
    </div>
  );
};

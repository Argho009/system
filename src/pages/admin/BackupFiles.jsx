import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import {
  HardDrive, ExternalLink, Download, RefreshCw,
  Folder, CloudOff, Archive, Calendar, CheckCircle2
} from 'lucide-react';

const DRIVE_FOLDER_ID = '1f6C5udwQatfGxF6uX_Lcxk2BDwehU4nI';
const DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`;
const DRIVE_EMBED_URL = `https://drive.google.com/embeddedfolderview?id=${DRIVE_FOLDER_ID}#list`;

export const BackupFiles = () => {
  const [archives, setArchives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('drive'); // 'drive' | 'archives'
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    loadArchives();
  }, []);

  const loadArchives = async () => {
    setLoading(true);
    try {
      const data = await api.getArchiveLog();
      setArchives(data || []);
    } catch {
      setArchives([]);
    }
    setLoading(false);
  };

  const archiveCols = [
    { header: 'Branch', accessor: 'branch' },
    { header: 'Sem', accessor: 'sem' },
    { header: 'Academic Year', accessor: 'academic_year' },
    { header: 'Students', accessor: 'students_count' },
    {
      header: 'Rows Deleted',
      accessor: 'rows_deleted',
      render: r => r.rows_deleted?.toLocaleString() || '—'
    },
    {
      header: 'Archived By',
      accessor: 'archived_by',
      render: r => r.users?.name || '—'
    },
    {
      header: 'Date',
      accessor: 'created_at',
      render: r => new Date(r.created_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },
    {
      header: 'Status',
      accessor: 'status',
      render: r => (
        <Badge
          variant={r.status === 'completed' ? 'green' : r.status === 'partial' ? 'warning' : 'danger'}
          className="uppercase text-[10px]"
        >
          {r.status}
        </Badge>
      )
    },
    {
      header: 'Download',
      accessor: 'file_url',
      render: r => r.file_url ? (
        <a
          href={r.file_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline"
        >
          <Download className="w-3.5 h-3.5" />
          Excel
        </a>
      ) : <span className="text-slate-300 text-xs">—</span>
    }
  ];

  const completedCount = archives.filter(a => a.status === 'completed').length;
  const totalRows = archives.reduce((sum, a) => sum + (a.rows_deleted || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-indigo-600" />
            Backup Files
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Google Drive database backups and semester archive exports.
          </p>
        </div>
        <a
          href={DRIVE_FOLDER_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-indigo-300 transition-colors shadow-sm"
        >
          <Folder className="w-4 h-4 text-yellow-500" />
          Open in Google Drive
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Archive className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{completedCount}</div>
            <div className="text-xs text-slate-500">Successful Archives</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{totalRows.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Total Rows Cleaned</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-11 h-11 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {archives[0] ? new Date(archives[0].created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
            </div>
            <div className="text-xs text-slate-500">Last Archive Date</div>
          </div>
        </div>
      </div>

      {/* TAB TOGGLE */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setView('drive')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            view === 'drive'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Folder className="w-4 h-4" />
            Google Drive Backups
          </span>
        </button>
        <button
          onClick={() => setView('archives')}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            view === 'archives'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Semester Archives ({archives.length})
          </span>
        </button>
      </div>

      {/* DRIVE VIEW */}
      {view === 'drive' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Folder className="w-4 h-4 text-yellow-500" />
              <span className="font-medium">AMS Backups Drive Folder</span>
              <span className="text-slate-400 text-xs font-mono">{DRIVE_FOLDER_ID}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded border border-slate-200 hover:border-indigo-300 bg-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload
              </button>
              <a
                href={DRIVE_FOLDER_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium px-3 py-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Full Screen
              </a>
            </div>
          </div>

          <div className="relative">
            <iframe
              key={iframeKey}
              src={DRIVE_EMBED_URL}
              title="Google Drive Backup Folder"
              className="w-full border-0"
              style={{ height: '560px' }}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/90 to-transparent p-4 text-center">
              <p className="text-xs text-slate-500">
                If the folder doesn't load,{' '}
                <a href={DRIVE_FOLDER_URL} target="_blank" rel="noreferrer" className="text-indigo-600 font-medium hover:underline">
                  click here to open in Google Drive ↗
                </a>
              </p>
            </div>
          </div>

          <div className="px-5 py-3 bg-blue-50 border-t border-blue-100 flex items-start gap-2 text-xs text-blue-700">
            <CloudOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Daily SQL dumps can be uploaded here automatically by GitHub Actions.
              Files are often named <code className="bg-blue-100 px-1 rounded">backup_daily_YYYYMMDD_HHMM.sql.gz</code>.
            </span>
          </div>
        </div>
      )}

      {view === 'archives' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-700">Semester Archive Log</span>
            <button
              onClick={loadArchives}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded border border-slate-200 bg-white hover:border-indigo-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
          <div className="p-4">
            <Table
              columns={archiveCols}
              data={archives}
              emptyMessage="No semester archives yet. Use Archive Semester to export and clean up old data."
            />
          </div>
        </div>
      )}

      <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 text-sm text-amber-800 space-y-2">
        <div className="font-bold flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          CI / backup setup
        </div>
        <p className="text-xs text-amber-700">
          Configure repository secrets and workflows so nightly backups and Drive uploads match your hosting stack (e.g. database credentials and Google service account JSON).
        </p>
      </div>
    </div>
  );
};

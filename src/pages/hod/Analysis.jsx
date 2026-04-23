import React, { useState, useEffect } from 'react';
import * as api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { toast } from '../../components/ui/Toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export const HodAnalysis = () => {
  const [branch, setBranch] = useState('');
  const [sem, setSem] = useState('');
  const [subject, setSubject] = useState('');
  const [testName, setTestName] = useState('');
  const [chartData, setChartData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getBranches().then((data) => {
      if (data) setBranches(data.map((b) => b.name));
    });
  }, []);

  useEffect(() => {
    if (branch && sem) {
      api
        .getSubjects()
        .then((all) => {
          const filtered = (all || []).filter((s) => s.branch === branch && s.sem === parseInt(sem, 10));
          setSubjects(filtered);
        })
        .catch(() => setSubjects([]));
    }
  }, [branch, sem]);

  const generateChart = async () => {
    if (!subject || !testName) return toast.error('Select subject and test name');
    setLoading(true);
    try {
      const data = await api.getCtMarks({ subject_id: subject, test_name: testName });
      const processed = (data || []).map((d) => ({
        name: d.students?.roll_no || 'N/A',
        marks: d.marks_obtained,
        max: d.max_marks,
        pct: d.max_marks ? Math.round((d.marks_obtained / d.max_marks) * 100) : 0,
      })).sort((a, b) => b.pct - a.pct);
      setChartData(processed);
    } catch (e) {
      toast.error(e.message || 'Failed to load');
    }
    setLoading(false);
  };

  const avg = chartData.length ? (chartData.reduce((a, b) => a + b.pct, 0) / chartData.length).toFixed(1) : 0;
  const below40 = chartData.filter((d) => d.pct < 40).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Marks Analysis</h2>
        <p className="text-sm text-slate-500">View CT/Test marks distribution per subject.</p>
      </div>

      <div className="bg-white p-4 border border-slate-200 rounded-lg flex gap-4 flex-wrap items-end">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Branch</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Select...</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Semester</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            value={sem}
            onChange={(e) => setSem(e.target.value)}
          >
            <option value="">Select...</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Sem {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Subject</label>
          <select
            className="h-10 rounded border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 min-w-[200px]"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Select...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-slate-700">Test name (e.g. CT1)</label>
          <input
            className="h-10 rounded border border-slate-300 px-3 text-sm"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            placeholder="CT1"
          />
        </div>
        <Button onClick={generateChart} disabled={loading}>
          {loading ? 'Loading...' : 'Generate'}
        </Button>
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-4 border rounded-lg h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="pct" fill="#6366f1" name="%" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Class avg %:</strong> {avg}
            </p>
            <p>
              <strong>Below 40%:</strong> {below40} students
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { Input } from './Input';
import { toast } from './Toast';
import { RefreshCw, Save } from 'lucide-react';

export const SystemSettingsForm = () => {
  const [config, setConfig] = useState({
    academic_year: '',
    lectures_per_day: 8,
    working_days_per_week: 6
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setLoading(true);
    const { data } = await supabase.from('system_config').select('*');
    if (data) {
      const configObj = {};
      data.forEach(item => {
        configObj[item.key] = item.value;
      });
      setConfig({
        academic_year: configObj.academic_year || '2024-25',
        lectures_per_day: parseInt(configObj.lectures_per_day) || 8,
        working_days_per_week: parseInt(configObj.working_days_per_week) || 6
      });
    }
    setLoading(false);
  }

  const handleSave = async () => {
    setSaving(true);
    const updates = [
      { key: 'academic_year', value: config.academic_year },
      { key: 'lectures_per_day', value: config.lectures_per_day.toString() },
      { key: 'working_days_per_week', value: config.working_days_per_week.toString() }
    ];

    const { error } = await supabase.from('system_config').upsert(updates);
    
    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('System variables updated globally');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
        <RefreshCw className="h-6 w-6 text-indigo-600 animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="space-y-3">
            <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Academic Year</label>
                <Input 
                    value={config.academic_year} 
                    onChange={(e) => setConfig({...config, academic_year: e.target.value.toUpperCase()})}
                    placeholder="2024-25"
                    className="h-11 font-black text-slate-800"
                />
                <p className="text-[10px] text-slate-400 font-medium mt-2 px-1">Format: YYYY-YY (e.g., 2026-27)</p>
            </div>
        </div>

        <div className="col-span-1 space-y-3">
            <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Lectures per Day</label>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{config.lectures_per_day} Units</span>
                </div>
                <input 
                    type="range" 
                    min="4" 
                    max="8" 
                    step="1"
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    value={config.lectures_per_day} 
                    onChange={(e) => setConfig({...config, lectures_per_day: parseInt(e.target.value)})}
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-300 mt-2 px-1">
                    <span>4 (MIN)</span>
                    <span>8 (MAX)</span>
                </div>
            </div>
        </div>

        <div className="col-span-1 space-y-3">
            <div className="flex flex-col">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Working Week</label>
                <div className="grid grid-cols-6 gap-2">
                    {[1,2,3,4,5,6].map(d => (
                        <button
                            key={d}
                            onClick={() => setConfig({...config, working_days_per_week: d})}
                            className={`h-11 rounded-xl text-xs font-bold transition-all ${config.working_days_per_week === d ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>
      
      <div className="pt-6 border-t border-slate-50 flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="px-10 h-12 rounded-2xl shadow-xl shadow-indigo-100/50">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Commit System State
        </Button>
      </div>
    </div>
  );
};

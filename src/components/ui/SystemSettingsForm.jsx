import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from './Button';
import { Input } from './Input';
import { toast } from './Toast';

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

  const fetchConfig = async () => {
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
  };

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
      toast.success('System settings updated');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-4 text-center text-slate-500">Loading system settings...</div>;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 className="font-semibold text-slate-800">Global System Settings</h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Academic Year</label>
            <Input 
              value={config.academic_year} 
              onChange={(e) => setConfig({...config, academic_year: e.target.value})}
              placeholder="e.g. 2024-25"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Lectures Per Day</label>
            <Input 
              type="number" 
              min={4} 
              max={8}
              value={config.lectures_per_day} 
              onChange={(e) => setConfig({...config, lectures_per_day: parseInt(e.target.value)})}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Working Days Per Week</label>
            <Input 
              type="number" 
              min={1} 
              max={6}
              value={config.working_days_per_week} 
              onChange={(e) => setConfig({...config, working_days_per_week: parseInt(e.target.value)})}
            />
          </div>
        </div>
        <div className="pt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Update Global Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

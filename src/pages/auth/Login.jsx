import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { GraduationCap, ShieldCheck } from 'lucide-react';

export const Login = () => {
  const { session, role, login, loading: authLoading } = useAuth();
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // CRITICAL: prevents flash of login form
  if (authLoading) return null;
  if (session && role) return <Navigate to={`/${role}`} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!collegeId || !password) return;
    setLoading(true);
    try {
      await login(collegeId, password);
    } catch (e) {
      // Error is handled in useAuth toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="mb-8 text-center animate-in fade-in slide-in-from-top duration-700">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100 mb-4">
          <GraduationCap className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CAMS Portal</h1>
        <p className="text-slate-500 mt-2 font-medium">College Attendance Management System</p>
      </div>

      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-bottom duration-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="College ID" 
            placeholder="e.g. 2024CS101"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            disabled={loading}
            required
            className="h-12"
          />
          <Input 
            label="Password" 
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            className="h-12"
          />
          <Button 
            type="submit" 
            className="w-full h-12 text-base font-bold" 
            disabled={loading || !collegeId || !password}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Signing in...
              </div>
            ) : 'Access Dashboard'}
          </Button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
            <ShieldCheck className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong>Security Protocol:</strong> Administrator creates all accounts. 
              Self-registration is disabled. Contact IT support if you cannot log in.
            </p>
          </div>
        </div>
      </div>
      
      <footer className="mt-12 text-slate-400 text-[10px] uppercase font-bold tracking-widest text-center">
        &copy; 2026 Educational Trust Management System &bull; V2.0 Production
      </footer>
    </div>
  );
};

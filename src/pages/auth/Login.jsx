import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

export const Login = () => {
  const { session, role, login } = useAuth();
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (session && role) {
    return <Navigate to={`/${role}`} replace />;
  }

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
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl border border-slate-100">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-indigo-700">College AMS</h1>
          <p className="text-slate-500 mt-2 text-sm">Attendance Management System</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            label="College ID" 
            placeholder="Enter your college ID"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
            disabled={loading}
          />
          <Input 
            label="Password" 
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !collegeId || !password}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <div className="mt-6 text-center text-xs text-slate-400">
          Administrator creates all accounts. If you cannot log in, contact IT.
        </div>
      </div>
    </div>
  );
};

import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setRole(session?.user?.app_metadata?.role || null);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setRole(session?.user?.app_metadata?.role || null);
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const login = async (college_id, password) => {
    const email = college_id.includes('@')
      ? college_id
      : college_id + '@college.edu';
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { toast.error(error.message); throw error; }
    const userRole = data.user?.app_metadata?.role;
    if (!userRole) {
      await supabase.auth.signOut();
      toast.error('Account setup incomplete. Contact administrator.');
      throw new Error('No role assigned');
    }
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error(error.message);
  };

  const changePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { toast.error(error.message); throw error; }
    toast.success('Password changed successfully');
  };

  return (
    <AuthContext.Provider value={{
      session, user: session?.user, role, loading,
      login, logout, changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

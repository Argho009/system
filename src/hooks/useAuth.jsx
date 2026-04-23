import { useState, useEffect, createContext, useContext } from 'react';
import * as api from '../lib/api';
import { toast } from '../components/ui/Toast';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .authMe()
      .then(({ user, session: sess }) => {
        if (user) {
          const r = user.app_metadata?.role || null;
          setSession(sess || { user });
          setRole(r);
        } else {
          setSession(null);
          setRole(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setRole(null);
        setLoading(false);
      });
  }, []);

  const login = async (college_id, password) => {
    try {
      await api.authLogin(college_id, password);
      const me = await api.authMe();
      const r = me.user?.app_metadata?.role || null;
      setSession(me.session || (me.user ? { user: me.user } : null));
      setRole(r);
      return me;
    } catch (error) {
      toast.error(error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.authLogout();
      setSession(null);
      setRole(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const user = session?.user || null;

  return (
    <AuthContext.Provider value={{ session, user, role, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};

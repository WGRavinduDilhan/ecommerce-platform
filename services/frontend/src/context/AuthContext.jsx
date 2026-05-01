import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const ACTIVE_USER_KEY = 'shop_active_user_v2';
const USERS_KEY = 'shop_users_v2';
const ADMIN_SEED_USER = { name: 'Admin', email: 'admin@eastlane.com', password: 'admin123', role: 'admin' };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACTIVE_USER_KEY)) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Ensure admin exists
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (!users.find((u) => u.email === ADMIN_SEED_USER.email)) {
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, ADMIN_SEED_USER]));
    }
  }, []);

  const login = (email, password) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const u = users.find((u) => u.email === email.trim().toLowerCase() && u.password === password);
    if (!u) throw new Error('Invalid email or password');
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  };

  const register = (name, email, password) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find((u) => u.email === email.trim().toLowerCase())) {
      throw new Error('Email already registered');
    }
    const newUser = { name: name.trim(), email: email.trim().toLowerCase(), password, role: 'customer' };
    localStorage.setItem(USERS_KEY, JSON.stringify([...users, newUser]));
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem(ACTIVE_USER_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

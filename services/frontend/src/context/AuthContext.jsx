import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const ACTIVE_USER_KEY = 'shop_active_user_v2';
const USERS_KEY = 'shop_users_v2';
const ADMIN_SEED_USER = { name: 'Admin', email: 'admin@eastlane.com', password: 'admin123', role: 'admin' };
const SELLER_SEED_USER = {
  name: 'Nadia Cole',
  businessName: 'Northstar Atelier',
  email: 'seller@eastlane.com',
  password: 'seller123',
  role: 'seller',
  status: 'verified',
};

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
      const nextUsers = [...users, ADMIN_SEED_USER];
      if (!nextUsers.find((u) => u.email === SELLER_SEED_USER.email)) {
        nextUsers.push(SELLER_SEED_USER);
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
    } else if (!users.find((u) => u.email === SELLER_SEED_USER.email)) {
      localStorage.setItem(USERS_KEY, JSON.stringify([...users, SELLER_SEED_USER]));
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

  const register = (name, email, password, role = 'customer', businessName = '') => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find((u) => u.email === email.trim().toLowerCase())) {
      throw new Error('Email already registered');
    }
    const normalizedRole = role === 'seller' ? 'seller' : 'customer';
    const newUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: normalizedRole,
      businessName: normalizedRole === 'seller' ? businessName.trim() || `${name.trim()}'s Store` : '',
      status: normalizedRole === 'seller' ? 'pending' : 'active',
    };
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

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import * as toast from '../toast';

export function Auth() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const initialMode = queryParams.get('mode') === 'register' ? 'register' : 'login';
  const initialRole = queryParams.get('role') === 'seller' ? 'seller' : 'customer';
  const redirect = queryParams.get('redirect') || '/';

  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', businessName: '', email: '', password: '', role: initialRole });

  useEffect(() => {
    if (!user) return;
    const target = redirect !== '/' ? redirect : user.role === 'seller' ? '/seller' : user.role === 'admin' ? '/admin' : '/';
    navigate(target, { replace: true });
  }, [user, navigate, redirect]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      if (mode === 'login') {
        const u = login(form.email, form.password);
        toast.success(`Welcome back, ${u.name}!`);
      } else {
        const u = register(form.name, form.email, form.password, form.role, form.businessName);
        toast.success(u.role === 'seller' ? `Seller account created for ${u.businessName || u.name}.` : `Welcome to Eastlane, ${u.name}!`);
      }
      const target = redirect !== '/' ? redirect : form.role === 'seller' ? '/seller' : '/';
      navigate(target, { replace: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card-wrapper">
        <div className="auth-header">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{mode === 'login' ? 'Enter your details to access your account.' : 'Join us as a shopper or launch your own seller storefront.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  id="name" name="name" type="text" required 
                  value={form.name} onChange={handleChange} 
                  placeholder="Alex Silva" 
                />
              </div>

              <div className="form-group">
                <label>Account Type</label>
                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-card ${form.role === 'customer' ? 'selected' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, role: 'customer' }))}
                  >
                    <strong>Customer</strong>
                    <span>Shop, save, and track orders.</span>
                  </button>
                  <button
                    type="button"
                    className={`role-card ${form.role === 'seller' ? 'selected' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, role: 'seller' }))}
                  >
                    <strong>Seller</strong>
                    <span>List products and manage your storefront.</span>
                  </button>
                </div>
              </div>

              {form.role === 'seller' && (
                <div className="form-group">
                  <label htmlFor="businessName">Business Name</label>
                  <input 
                    id="businessName" name="businessName" type="text" required 
                    value={form.businessName} onChange={handleChange} 
                    placeholder="Northstar Atelier" 
                  />
                </div>
              )}
            </>
          )}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              id="email" name="email" type="email" required 
              value={form.email} onChange={handleChange} 
              placeholder="alex@example.com" 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              id="password" name="password" type="password" required 
              value={form.password} onChange={handleChange} 
              placeholder="••••••••" 
            />
          </div>

          <button type="submit" className="primary-button full-width mt-2">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>New here? <button className="text-button inline" onClick={() => setMode('register')}>Create an account</button></p>
          ) : (
            <p>Already have an account? <button className="text-button inline" onClick={() => setMode('login')}>Sign in</button></p>
          )}
          {mode === 'register' && form.role === 'seller' && (
            <p className="hint auth-hint">Seller accounts unlock the storefront dashboard, catalog tools, and product analytics.</p>
          )}
        </div>
      </div>
    </div>
  );
}

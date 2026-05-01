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
  const redirect = queryParams.get('redirect') || '/';

  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    if (user) navigate(redirect);
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
        const u = register(form.name, form.email, form.password);
        toast.success(`Welcome to Eastlane, ${u.name}!`);
      }
      navigate(redirect);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="auth-container fade-in">
      <div className="auth-card-wrapper">
        <div className="auth-header">
          <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{mode === 'login' ? 'Enter your details to access your account.' : 'Join us and start shopping premium goods.'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input 
                id="name" name="name" type="text" required 
                value={form.name} onChange={handleChange} 
                placeholder="Alex Silva" 
              />
            </div>
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
        </div>
      </div>
    </div>
  );
}

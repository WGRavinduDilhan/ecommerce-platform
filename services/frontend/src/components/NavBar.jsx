import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import * as toast from '../toast';
import { ShoppingCart, User, LogOut, Package, Shield } from 'lucide-react';

export function NavBar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully.');
  };

  return (
    <header className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">E</span>
        <div className="brand-text">
          <strong>Eastlane Shop</strong>
          <small>Premium Lifestyle</small>
        </div>
      </Link>

      <nav className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
          Home
        </Link>
        <Link to="/cart" className={`nav-link ${location.pathname === '/cart' ? 'active' : ''}`}>
          <ShoppingCart size={18} />
          Cart {count > 0 && <span className="cart-badge">{count}</span>}
        </Link>
        {user && user.role !== 'admin' && (
          <Link to="/orders" className={`nav-link ${location.pathname === '/orders' ? 'active' : ''}`}>
            <Package size={18} />
            Orders
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
            <Shield size={18} />
            Admin
          </Link>
        )}
      </nav>

      <div className="nav-actions">
        {user ? (
          <div className="user-menu">
            <span className="welcome">
              <User size={16} /> Hi, {user.name.split(' ')[0]}
            </span>
            <button className="icon-button" onClick={handleLogout} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            <Link to="/auth?mode=login" className="ghost-button">Login</Link>
            <Link to="/auth?mode=register" className="primary-button">Sign Up</Link>
          </div>
        )}
      </div>
    </header>
  );
}

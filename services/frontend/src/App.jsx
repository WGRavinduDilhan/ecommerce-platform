import { useEffect, useMemo, useState } from 'react';
import { createOrder, getProducts, createProduct, updateProduct, deleteProduct } from './api';
import * as cartLib from './cart';
import * as toast from './toast';

const USERS_KEY = 'shop_users_v1';
const ACTIVE_USER_KEY = 'shop_active_user_v1';
const ADMIN_SEED_USER = { name: 'Admin', email: 'admin@eastlane.com', password: 'admin123', role: 'admin' };

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit Card', icon: '💳' },
  { id: 'stripe', name: 'Stripe', icon: '🔵' },
  { id: 'paypal', name: 'PayPal', icon: '🅿️' },
  { id: 'apple', name: 'Apple Pay', icon: '🍎' },
  { id: 'cod', name: 'Cash on Delivery', icon: '💵' },
];

// Ensure admin account exists
function ensureAdminExists() {
  const users = readUsers();
  if (!users.find((u) => u.email === ADMIN_SEED_USER.email)) {
    saveUsers([...users, ADMIN_SEED_USER]);
  }
}

ensureAdminExists();

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function productImage(product) {
  if (product.image) {
    return product.image;
  }
  const seed = `${product.category || 'product'}-${product.name}`.toLowerCase().replace(/\s+/g, '-');
  return `https://picsum.photos/seed/ecom-${seed}/640/460`;
}

function generatePlaceholderImage(name, category) {
  const seed = `${category || 'product'}-${name}`.toLowerCase().replace(/\s+/g, '-');
  return `https://picsum.photos/seed/ecom-${seed}/640/460`;
}

function readUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function AdminDashboard({ products, loading, onRefresh, activeUser }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', price: '', stock: '', image: '', imagePreview: '' });

  function resetForm() {
    setEditId(null);
    setForm({ name: '', category: '', price: '', stock: '', image: '', imagePreview: '' });
  }

  function startEdit(product) {
    setEditId(product.id);
    const preview = product.image || generatePlaceholderImage(product.name, product.category);
    setForm({ name: product.name, category: product.category, price: String(product.price), stock: String(product.stock), image: product.image || '', imagePreview: preview });
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setForm((prev) => ({ ...prev, image: base64, imagePreview: base64 }));
      toast.info('Image loaded successfully.');
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!form.name || !form.category || !form.price || !form.stock) {
      toast.error('All fields required.');
      return;
    }

    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
      };
      if (form.image) {
        payload.image = form.image;
      }

      if (editId) {
        await updateProduct(editId, payload);
        toast.success('Product updated.');
      } else {
        await createProduct(payload);
        toast.success('Product created.');
      }
      resetForm();
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(productId) {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(productId);
      toast.success('Product deleted.');
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <section className="surface">
      <div className="admin-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="hint">Manage products and inventory</p>
        </div>
      </div>

      <article className="admin-section">
        <h3>{editId ? 'Edit Product' : 'Add New Product'}</h3>
        <form onSubmit={handleSave} className="admin-form-container">
          <div className="form admin-form">
            <label>
              <span>Product name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              <span>Category</span>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
            </label>
            <label>
              <span>Price</span>
              <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            </label>
            <label>
              <span>Stock</span>
              <input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
            </label>
            <label>
              <span>Product Image (Optional)</span>
              <input type="file" accept="image/*" onChange={handleImageChange} />
              <p className="hint">If no image uploaded, a sample will be generated from product name.</p>
            </label>
          </div>
          {form.imagePreview && (
            <div className="image-preview">
              <p>Image preview:</p>
              <img src={form.imagePreview} alt="Preview" />
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="primary-button" type="submit">{editId ? 'Update' : 'Create'}</button>
            {editId && <button className="ghost-button" type="button" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </article>

      <article className="admin-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Products ({products.length})</h3>
          <button className="ghost-button" onClick={onRefresh}>Refresh</button>
        </div>

        <div className="products-table">
          {loading ? <p className="empty-state">Loading...</p> : null}
          {!loading && !products.length ? <p className="empty-state">No products.</p> : null}
          {products.map((p) => (
            <div key={p.id} className="product-row">
              <div className="product-row-info">
                <strong>{p.name}</strong>
                <p className="hint">{p.category} · ${Number(p.price).toFixed(2)} · {p.stock} stock</p>
              </div>
              <div className="product-row-actions">
                <button className="ghost-button" onClick={() => startEdit(p)}>Edit</button>
                <button className="danger-button" onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function NavBar({ currentPage, setCurrentPage, cartCount, activeUser, onLogout }) {
  return (
    <header className="navbar">
      <button className="brand" onClick={() => setCurrentPage('home')}>
        <span className="brand-mark">E</span>
        <span>
          <strong>Eastlane Shop</strong>
          <small>Everyday ecommerce</small>
        </span>
      </button>

      <nav className="nav-links">
        <button className={currentPage === 'home' ? 'nav-link active' : 'nav-link'} onClick={() => setCurrentPage('home')}>
          Home
        </button>
        <button className={currentPage === 'cart' ? 'nav-link active' : 'nav-link'} onClick={() => setCurrentPage('cart')}>
          Cart ({cartCount})
        </button>
      </nav>

      <div className="nav-actions">
        {activeUser ? (
          <>
            <span className="welcome">Hi, {activeUser.name} {activeUser.role === 'admin' && <span className="admin-badge">Admin</span>}</span>
            <button className="ghost-button" onClick={onLogout}>Logout</button>
          </>
        ) : (
          <>
            <button className="ghost-button" onClick={() => setCurrentPage('login')}>Login</button>
            <button className="primary-button" onClick={() => setCurrentPage('register')}>Register</button>
          </>
        )}
      </div>
    </header>
  );
}

function ProductCard({ product, onAdd }) {
  return (
    <article className="product-card">
      <img src={productImage(product)} alt={product.name} className="product-image" />
      <div className="product-content">
        <p className="chip">{product.category || 'General'}</p>
        <h3>{product.name}</h3>
        <p className="sku">Product #{product.id}</p>
        <div className="price-row">
          <strong>{currency(product.price)}</strong>
          <span>{product.stock} in stock</span>
        </div>
        <button className="primary-button" onClick={() => onAdd(product)} disabled={Number(product.stock) <= 0}>
          {Number(product.stock) > 0 ? 'Add to cart' : 'Out of stock'}
        </button>
      </div>
    </article>
  );
}

function HomePage({ products, loading, onAdd }) {
  return (
    <section className="surface">
      <div className="hero">
        <div>
          <p className="eyebrow">New season arrivals</p>
          <h1>Find your next favorite product</h1>
          <p>Browse everything in one place, compare prices quickly, and add items to your cart in one click.</p>
        </div>
        <div className="hero-note">
          <p>Available products</p>
          <strong>{products.length}</strong>
        </div>
      </div>

      {loading ? <p className="empty-state">Loading products...</p> : null}

      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onAdd={onAdd} />
        ))}
      </div>

      {!loading && !products.length ? <p className="empty-state">No products are available right now.</p> : null}
    </section>
  );
}

function RegisterPage({ onRegistered, onSwitchLogin }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    if (!name || !email || !password) {
      setError('Please fill all fields.');
      return;
    }

    const users = readUsers();
    if (users.find((u) => u.email === email)) {
      setError('This email is already registered.');
      return;
    }

    const user = { name, email, password };
    saveUsers([...users, user]);
    onRegistered({ name: user.name, email: user.email, role: 'customer' });
  }

  return (
    <section className="auth-card">
      <h2>Create your account</h2>
      <p>Register once and complete checkout faster next time.</p>
      {error ? <div className="alert">{error}</div> : null}
      <form onSubmit={handleSubmit} className="form">
        <label>
          <span>Full name</span>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Alex Silva" required />
        </label>
        <label>
          <span>Email</span>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="alex@example.com" required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="********" required />
        </label>
        <button className="primary-button" type="submit">Create account</button>
      </form>
      <button className="text-button" onClick={onSwitchLogin}>Already have an account? Login</button>
    </section>
  );
}

function LoginPage({ onLoggedIn, onSwitchRegister }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  function handleChange(event) {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const users = readUsers();
    const user = users.find((u) => u.email === email && u.password === password);

    if (!user) {
      setError('Invalid email or password.');
      return;
    }

    onLoggedIn({ name: user.name, email: user.email, role: user.role || 'customer' });
  }

  return (
    <section className="auth-card">
      <h2>Welcome back</h2>
      <p>Login to continue to checkout and order tracking.</p>
      {error ? <div className="alert">{error}</div> : null}
      <form onSubmit={handleSubmit} className="form">
        <label>
          <span>Email</span>
          <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="alex@example.com" required />
        </label>
        <label>
          <span>Password</span>
          <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="********" required />
        </label>
        <button className="primary-button" type="submit">Login</button>
      </form>
      <button className="text-button" onClick={onSwitchRegister}>New here? Create an account</button>
    </section>
  );
}

function PaymentMethodSelector({ onSelect, total, onBack }) {
  return (
    <section className="surface">
      <div className="section-header">
        <h2>Select Payment Method</h2>
        <p>Choose how you'd like to pay for your order.</p>
      </div>
      <div className="payment-summary">
        <p>Order Total</p>
        <strong>{currency(total)}</strong>
      </div>
      <div className="payment-methods-grid">
        {PAYMENT_METHODS.map((method) => (
          <button
            key={method.id}
            className="payment-method-card"
            onClick={() => onSelect(method.id)}
          >
            <div className="payment-icon">{method.icon}</div>
            <div>{method.name}</div>
          </button>
        ))}
      </div>
      <button className="ghost-button" onClick={onBack} style={{ marginTop: '1rem' }}>
        Back to Cart
      </button>
    </section>
  );
}

function CartPage({ cart, onRemove, onCheckout, activeUser }) {
  const total = useMemo(
    () => cart.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    [cart],
  );

  return (
    <section className="surface">
      <div className="section-header">
        <h2>Your Cart</h2>
        {!activeUser ? <p className="hint">Login is required for checkout.</p> : null}
      </div>
      <div className="cart-list">
        {cart.items.map((item) => (
          <div className="cart-item" key={item.productId}>
            <div>
              <strong>{item.name}</strong>
              <p>Qty: {item.quantity}</p>
            </div>
            <div className="cart-item-right">
              <strong>{currency(Number(item.price) * Number(item.quantity))}</strong>
              <button className="ghost-button" onClick={() => onRemove(item.productId)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      {!cart.items.length ? <p className="empty-state">Your cart is empty.</p> : null}
      <div className="cart-footer">
        <div>
          <p>Total</p>
          <strong>{currency(total)}</strong>
        </div>
        <button className="primary-button" onClick={onCheckout} disabled={!cart.items.length}>
          Checkout
        </button>
      </div>
    </section>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [activeUser, setActiveUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [cart, setCart] = useState(() => cartLib.load());
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  useEffect(() => {
    const unsubscribe = toast.subscribe(setToasts);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function refreshProducts() {
      setLoading(true);
      setError('');
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        setError(err.message || 'Unable to load products.');
        toast.error(err.message || 'Failed to load products.');
      } finally {
        setLoading(false);
      }
    }

    refreshProducts();
  }, []);

  function persistActiveUser(user) {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    setActiveUser(user);
  }

  function handleLogout() {
    localStorage.removeItem(ACTIVE_USER_KEY);
    setActiveUser(null);
    setCurrentPage('home');
    toast.success('Logged out successfully.');
  }

  function handleAddToCart(product) {
    if (activeUser?.role === 'admin') {
      toast.info('Admins cannot add to cart.');
      return;
    }
    const updated = cartLib.add(cart, {
      productId: product.id,
      quantity: 1,
      price: product.price,
      name: product.name,
    });
    setCart(updated);
    cartLib.save(updated);
    toast.success('Added to cart.');
  }

  function handleRemoveCartItem(productId) {
    const updated = cartLib.remove(cart, productId);
    setCart(updated);
    cartLib.save(updated);
    toast.success('Removed from cart.');
  }

  function handleCheckoutStart() {
    if (!activeUser) {
      setCurrentPage('login');
      toast.info('Please login to checkout.');
      return;
    }

    if (activeUser.role === 'admin') {
      toast.error('Admin accounts cannot checkout.');
      return;
    }

    setSelectedPaymentMethod(null);
    setCurrentPage('payment');
  }

  async function handlePaymentMethodSelect(method) {
    setSelectedPaymentMethod(method);
    toast.success(`Payment method selected: ${PAYMENT_METHODS.find((m) => m.id === method)?.name}`);
    
    setError('');
    try {
      for (const item of cart.items) {
        await createOrder({
          product_id: Number(item.productId),
          quantity: Number(item.quantity),
          payment_method: method,
        });
      }

      const cleared = cartLib.clear();
      setCart(cleared);
      setCurrentPage('home');
      toast.success('Order placed successfully!');
    } catch (err) {
      setError(err.message || 'Checkout failed.');
      toast.error(err.message || 'Checkout failed.');
    }
  }

  const cartTotal = useMemo(
    () => cart.items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    [cart],
  );

  const refreshAdminProducts = () => {
    setLoading(true);
    getProducts().then((data) => { setProducts(data); setLoading(false); }).catch(() => setLoading(false));
  };

  return (
    <div className="shell">
      <div className="bg-blob bg-blob-a" />
      <div className="bg-blob bg-blob-b" />
      <main className="app-shell">
        <ToastContainer toasts={toasts} />
        <NavBar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          cartCount={cart.items.length}
          activeUser={activeUser}
          onLogout={handleLogout}
        />

        {error ? <div className="alert">{error}</div> : null}

        {currentPage === 'home' ? (
          activeUser?.role === 'admin' ? (
            <AdminDashboard
              products={products}
              loading={loading}
              onRefresh={refreshAdminProducts}
              activeUser={activeUser}
            />
          ) : (
            <HomePage products={products} loading={loading} onAdd={handleAddToCart} />
          )
        ) : null}

        {currentPage === 'register' ? (
          <RegisterPage
            onRegistered={(user) => {
              persistActiveUser(user);
              toast.success(`Welcome, ${user.name}!`);
              setCurrentPage('home');
            }}
            onSwitchLogin={() => setCurrentPage('login')}
          />
        ) : null}

        {currentPage === 'login' ? (
          <LoginPage
            onLoggedIn={(user) => {
              persistActiveUser(user);
              const role = user.role === 'admin' ? ' (Admin)' : '';
              toast.success(`Welcome back, ${user.name}${role}!`);
              setCurrentPage('home');
            }}
            onSwitchRegister={() => setCurrentPage('register')}
          />
        ) : null}

        {currentPage === 'payment' ? (
          <PaymentMethodSelector
            total={cartTotal}
            onSelect={handlePaymentMethodSelect}
            onBack={() => setCurrentPage('cart')}
          />
        ) : null}

        {currentPage === 'cart' ? (
          <CartPage
            cart={cart}
            onRemove={handleRemoveCartItem}
            onCheckout={handleCheckoutStart}
            activeUser={activeUser}
          />
        ) : null}
      </main>
    </div>
  );
}

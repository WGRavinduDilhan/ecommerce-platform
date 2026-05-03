import { useState, useEffect, useRef } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, getOrders } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as toast from '../toast';
import { Settings, Plus, Edit2, Trash2, Image as ImageIcon, Box, ListOrdered, TrendingUp, ShoppingBag, Users } from 'lucide-react';

// Compress & resize image to max 800px wide, quality 0.75 — keeps base64 under ~150KB
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 800;
        const scale = img.width > MAX_W ? MAX_W / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMPTY_FORM = { name: '', category: '', price: '', stock: '', image: '', imagePreview: '' };

function validateForm(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Product name is required';
  if (!form.category.trim()) errors.category = 'Category is required';
  const price = parseFloat(form.price);
  if (!form.price || isNaN(price) || price <= 0) errors.price = 'Price must be greater than 0';
  const stock = parseInt(form.stock);
  if (form.stock === '' || isNaN(stock) || stock < 0) errors.stock = 'Stock must be 0 or more';
  return errors;
}

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [formKey, setFormKey] = useState(0); // increments to force file-input reset
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [user, navigate]);

  const fetchData = async (signal) => {
    setLoading(true);
    try {
      const [productRes, orderRes] = await Promise.allSettled([
        getProducts(signal),
        getOrders(),
      ]);

      if (productRes.status === 'fulfilled') {
        setProducts(productRes.value);
      } else if (productRes.reason?.name !== 'AbortError') {
        toast.error('Failed to load products');
      }

      if (orderRes.status === 'fulfilled') {
        setOrders(orderRes.value);
      } else {
        // Order service may be temporarily unavailable — non-fatal
        console.warn('Order service unavailable:', orderRes.reason?.message);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to load admin data');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormKey(k => k + 1); // forces the <form> to remount, clearing the file input
    setShowModal(false);
  };

  const startEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      image: product.image || '',
      imagePreview: product.image || '',
    });
    setFormErrors({});
    setFormKey(k => k + 1);
    setShowModal(true);
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setForm(prev => ({ ...prev, image: compressed, imagePreview: compressed }));
    } catch {
      toast.error('Failed to process image. Please try another file.');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
      };
      if (form.image) payload.image = form.image;

      if (editId) {
        await updateProduct(editId, payload);
        toast.success('Product updated successfully');
      } else {
        await createProduct(payload);
        toast.success('Product created successfully');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Build a product lookup map for the orders table
  const productMap = products.reduce((map, p) => { map[p.id] = p; return map; }, {});

  // Stats
  const totalRevenue = orders.reduce((sum, o) => {
    const p = productMap[o.product_id];
    return sum + (p ? p.price * o.quantity : 0);
  }, 0);

  const currency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v || 0));

  if (loading) return (
    <div className="page-container">
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading admin panel...</p>
      </div>
    </div>
  );

  return (
    <div className="page-container fade-in">
      {/* Stats bar */}
      <div className="admin-stats-bar">
        <div className="admin-stat-card">
          <Box size={20} />
          <div>
            <strong>{products.length}</strong>
            <span>Products</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <ShoppingBag size={20} />
          <div>
            <strong>{orders.length}</strong>
            <span>Total Orders</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <TrendingUp size={20} />
          <div>
            <strong>{currency(totalRevenue)}</strong>
            <span>Total Revenue</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <Users size={20} />
          <div>
            <strong>{new Set(orders.map(o => o.user_email).filter(Boolean)).size}</strong>
            <span>Customers</span>
          </div>
        </div>
      </div>

      <div className="admin-dashboard">
        <aside className="admin-sidebar">
          <h2><Settings size={24} /> Admin Panel</h2>
          <nav className="admin-nav">
            <button className={`admin-nav-btn ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
              <Box size={18} /> Products
            </button>
            <button className={`admin-nav-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
              <ListOrdered size={18} /> All Orders
            </button>
          </nav>
        </aside>

        <main className="admin-content">
          {activeTab === 'products' && (
            <div className="admin-panel">
              <div className="admin-header">
                <h3>Product Catalog <span className="hint">({products.length} items)</span></h3>
                <button className="primary-button" onClick={() => { resetForm(); setShowModal(true); }}>
                  <Plus size={18} /> Add Product
                </button>
              </div>
              {products.length === 0 ? (
                <div className="empty-state">
                  <Box size={48} className="empty-icon" />
                  <h3>No products yet</h3>
                  <p>Click "Add Product" to create your first product.</p>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(p => (
                        <tr key={p.id}>
                          <td>
                            <img
                              src={p.image || `https://picsum.photos/seed/product-${p.id}/40/40`}
                              alt={p.name}
                              className="table-img"
                            />
                          </td>
                          <td><strong>{p.name}</strong></td>
                          <td><span className="chip">{p.category}</span></td>
                          <td>{currency(p.price)}</td>
                          <td>
                            <span className={p.stock <= 0 ? 'danger-text' : p.stock < 5 ? 'warn-text' : ''}>
                              {p.stock <= 0 ? 'Out of Stock' : p.stock}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="icon-button" onClick={() => startEdit(p)} title="Edit">
                                <Edit2 size={16} />
                              </button>
                              <button className="icon-button danger-text" onClick={() => handleDelete(p.id)} title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="admin-panel">
              <div className="admin-header">
                <h3>All Orders <span className="hint">({orders.length} orders)</span></h3>
              </div>
              {orders.length === 0 ? (
                <div className="empty-state">
                  <ListOrdered size={48} className="empty-icon" />
                  <h3>No orders yet</h3>
                  <p>Orders will appear here once customers start purchasing.</p>
                </div>
              ) : (
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Total</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => {
                        const prod = productMap[o.product_id];
                        return (
                          <tr key={o.id}>
                            <td>#{o.id}</td>
                            <td>{new Date(o.created_at).toLocaleDateString()}</td>
                            <td>{o.user_email || 'Guest'}</td>
                            <td>
                              {prod ? (
                                <div className="order-product-cell">
                                  <img
                                    src={prod.image || `https://picsum.photos/seed/product-${prod.id}/32/32`}
                                    alt={prod.name}
                                    className="table-img-sm"
                                  />
                                  <span>{prod.name}</span>
                                </div>
                              ) : (
                                <span className="hint">ID: {o.product_id}</span>
                              )}
                            </td>
                            <td>{o.quantity}</td>
                            <td>{prod ? currency(prod.price * o.quantity) : '-'}</td>
                            <td style={{ textTransform: 'capitalize' }}>{o.payment_method || '-'}</td>
                            <td><span className={`status-badge status-${o.status.toLowerCase()}`}>{o.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal-content">
            <h3>{editId ? 'Edit Product' : 'Add New Product'}</h3>
            {/* formKey forces file input to reset between opens */}
            <form key={formKey} onSubmit={handleSave} className="admin-form" noValidate>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  required
                  placeholder="e.g. Wireless Headphones"
                  value={form.name}
                  onChange={e => { setForm({ ...form, name: e.target.value }); setFormErrors(prev => ({ ...prev, name: '' })); }}
                  className={formErrors.name ? 'input-error' : ''}
                />
                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  required
                  placeholder="e.g. Electronics"
                  value={form.category}
                  onChange={e => { setForm({ ...form, category: e.target.value }); setFormErrors(prev => ({ ...prev, category: '' })); }}
                  className={formErrors.category ? 'input-error' : ''}
                />
                {formErrors.category && <span className="field-error">{formErrors.category}</span>}
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={form.price}
                    onChange={e => { setForm({ ...form, price: e.target.value }); setFormErrors(prev => ({ ...prev, price: '' })); }}
                    className={formErrors.price ? 'input-error' : ''}
                  />
                  {formErrors.price && <span className="field-error">{formErrors.price}</span>}
                </div>
                <div className="form-group">
                  <label>Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={form.stock}
                    onChange={e => { setForm({ ...form, stock: e.target.value }); setFormErrors(prev => ({ ...prev, stock: '' })); }}
                    className={formErrors.stock ? 'input-error' : ''}
                  />
                  {formErrors.stock && <span className="field-error">{formErrors.stock}</span>}
                </div>
              </div>
              <div className="form-group file-upload-group">
                <label>Product Image <span className="hint">(auto-compressed)</span></label>
                <div className="file-input-wrapper">
                  <ImageIcon size={20} />
                  <span>{form.imagePreview ? 'Change Image' : 'Choose Image'}</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                </div>
                {form.imagePreview && (
                  <div className="img-preview-container">
                    <img src={form.imagePreview} alt="Preview" className="img-preview" />
                    <button
                      type="button"
                      className="text-button danger-text"
                      onClick={() => setForm(prev => ({ ...prev, image: '', imagePreview: '' }))}
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Saving...' : editId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { getProducts, createProduct, updateProduct, deleteProduct, getOrders } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as toast from '../toast';
import { Settings, Plus, Edit2, Trash2, Image as ImageIcon, Box, ListOrdered } from 'lucide-react';

export function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', price: '', stock: '', image: '', imagePreview: '' });
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([getProducts(), getOrders()]);
      setProducts(p);
      setOrders(o);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setForm({ name: '', category: '', price: '', stock: '', image: '', imagePreview: '' });
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
      imagePreview: product.image || '' 
    });
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      setForm((prev) => ({ ...prev, image: base64, imagePreview: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
      };
      if (form.image) payload.image = form.image;

      if (editId) {
        await updateProduct(editId, payload);
        toast.success('Product updated');
      } else {
        await createProduct(payload);
        toast.success('Product created');
      }
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <div className="page-container"><div className="loading-state"><div className="spinner"></div></div></div>;

  return (
    <div className="page-container fade-in">
      <div className="admin-dashboard">
        <aside className="admin-sidebar">
          <h2><Settings size={24}/> Admin Panel</h2>
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
                <h3>Product Catalog</h3>
                <button className="primary-button" onClick={() => {resetForm(); setShowModal(true);}}>
                  <Plus size={18} /> Add Product
                </button>
              </div>
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
                        <td><img src={p.image || 'https://picsum.photos/40'} alt={p.name} className="table-img" /></td>
                        <td>{p.name}</td>
                        <td><span className="chip">{p.category}</span></td>
                        <td>${p.price.toFixed(2)}</td>
                        <td>{p.stock}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="icon-button" onClick={() => startEdit(p)}><Edit2 size={16}/></button>
                            <button className="icon-button danger-text" onClick={() => handleDelete(p.id)}><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="admin-panel">
              <div className="admin-header">
                <h3>All Orders</h3>
              </div>
              <div className="admin-table-container">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>User Email</th>
                      <th>Product ID</th>
                      <th>Qty</th>
                      <th>Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{new Date(o.created_at).toLocaleDateString()}</td>
                        <td>{o.user_email || 'Guest'}</td>
                        <td>{o.product_id}</td>
                        <td>{o.quantity}</td>
                        <td style={{textTransform:'capitalize'}}>{o.payment_method || '-'}</td>
                        <td><span className={`status-badge status-${o.status.toLowerCase()}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{editId ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSave} className="admin-form">
              <div className="form-group">
                <label>Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div className="form-group-row">
                <div className="form-group">
                  <label>Price</label>
                  <input type="number" step="0.01" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} />
                </div>
              </div>
              <div className="form-group file-upload-group">
                <label>Product Image</label>
                <div className="file-input-wrapper">
                  <ImageIcon size={20} />
                  <span>Choose Image</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} />
                </div>
                {form.imagePreview && <img src={form.imagePreview} alt="Preview" className="img-preview" />}
              </div>
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={resetForm}>Cancel</button>
                <button type="submit" className="primary-button">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProduct, deleteProduct, getSellerProducts, updateProduct } from '../api';
import { useAuth } from '../context/AuthContext';
import * as toast from '../toast';
import { AlertCircle, Box, PencilLine, Plus, Sparkles, Store, Trash2, TrendingUp } from 'lucide-react';

const EMPTY_FORM = { name: '', category: '', price: '', stock: '', image: '' };

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export function Seller() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login&redirect=/seller');
      return;
    }
    if (user.role === 'admin') {
      navigate('/admin');
      return;
    }
    if (user.role !== 'seller') {
      navigate('/auth?mode=register&role=seller&redirect=/seller');
      return;
    }

    const controller = new AbortController();

    async function fetchProducts() {
      try {
        const data = await getSellerProducts(user.email, controller.signal);
        setProducts(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Failed to load seller catalog.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();
    return () => controller.abort();
  }, [user, navigate]);

  const stats = useMemo(() => {
    const liveStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const lowStock = products.filter((product) => Number(product.stock || 0) <= 3).length;
    const catalogValue = products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
    return { liveStock, lowStock, catalogValue };
  }, [products]);

  const resetForm = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
  };

  const beginEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name || '',
      category: product.category || '',
      price: String(product.price ?? ''),
      stock: String(product.stock ?? ''),
      image: product.image || '',
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.category.trim()) {
      toast.error('Product name and category are required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        stock: Number(form.stock),
        image: form.image.trim() || null,
        seller_name: user.businessName || user.name,
        seller_email: user.email,
      };

      if (editId) {
        await updateProduct(editId, payload);
        toast.success('Seller product updated.');
      } else {
        await createProduct(payload);
        toast.success('Seller product published.');
      }

      resetForm();
      const refreshed = await getSellerProducts(user.email);
      setProducts(refreshed);
    } catch (err) {
      toast.error(err.message || 'Failed to save seller product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Remove this product from your storefront?')) return;
    try {
      await deleteProduct(productId);
      toast.success('Product removed from seller catalog.');
      setProducts((current) => current.filter((product) => product.id !== productId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete product.');
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading seller studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in seller-page">
      <section className="seller-hero">
        <div>
          <p className="eyebrow">Seller Studio</p>
          <h1>{user.businessName || user.name}</h1>
          <p>Launch products, manage stock, and track a focused storefront built for independent sellers.</p>
        </div>
        <div className="seller-hero-card">
          <Store size={28} />
          <strong>{user.email}</strong>
          <span>{user.status || 'active'} seller account</span>
        </div>
      </section>

      <section className="market-strip seller-strip">
        <div className="market-strip-card">
          <Box size={20} />
          <div>
            <strong>{products.length}</strong>
            <span>Seller products</span>
          </div>
        </div>
        <div className="market-strip-card">
          <TrendingUp size={20} />
          <div>
            <strong>{stats.liveStock}</strong>
            <span>Live stock units</span>
          </div>
        </div>
        <div className="market-strip-card">
          <AlertCircle size={20} />
          <div>
            <strong>{stats.lowStock}</strong>
            <span>Low-stock alerts</span>
          </div>
        </div>
      </section>

      <section className="seller-dashboard-grid">
        <div className="seller-panel">
          <div className="section-header">
            <h2>{editId ? 'Edit listing' : 'Create a listing'}</h2>
            <p className="hint">Products go live instantly for your storefront.</p>
          </div>

          <form className="seller-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="seller-product-name">Product Name</label>
              <input id="seller-product-name" name="name" value={form.name} onChange={handleChange} placeholder="Handcrafted leather bag" />
            </div>
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="seller-product-category">Category</label>
                <input id="seller-product-category" name="category" value={form.category} onChange={handleChange} placeholder="Accessories" />
              </div>
              <div className="form-group">
                <label htmlFor="seller-product-price">Price</label>
                <input id="seller-product-price" name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} placeholder="79.99" />
              </div>
            </div>
            <div className="form-group-row">
              <div className="form-group">
                <label htmlFor="seller-product-stock">Stock</label>
                <input id="seller-product-stock" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} placeholder="12" />
              </div>
              <div className="form-group">
                <label htmlFor="seller-product-image">Image URL</label>
                <input id="seller-product-image" name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={resetForm}>Reset</button>
              <button type="submit" className="primary-button" disabled={saving}>
                <Plus size={18} />
                {saving ? 'Saving...' : editId ? 'Update product' : 'Publish product'}
              </button>
            </div>
          </form>
        </div>

        <div className="seller-panel seller-catalog-panel">
          <div className="section-header">
            <h2>Live catalog</h2>
            <p className="hint">Projected catalog value {currency(stats.catalogValue)}</p>
          </div>

          {products.length === 0 ? (
            <div className="empty-state">
              <Sparkles size={44} className="empty-icon" />
              <h3>No products yet</h3>
              <p>Start by publishing your first seller product.</p>
            </div>
          ) : (
            <div className="seller-product-list">
              {products.map((product) => (
                <article key={product.id} className="seller-product-card">
                  <img
                    src={product.image || `https://picsum.photos/seed/seller-${product.id}/400/280`}
                    alt={product.name}
                    className="seller-product-image"
                  />
                  <div className="seller-product-body">
                    <div className="product-header">
                      <span className="chip">{product.category || 'General'}</span>
                      <span className="sku">#{product.id}</span>
                    </div>
                    <h3>{product.name}</h3>
                    <p className="hint">{currency(product.price)} · {product.stock} in stock</p>
                    <div className="action-buttons">
                      <button className="icon-button" type="button" onClick={() => beginEdit(product)} title="Edit product">
                        <PencilLine size={16} />
                      </button>
                      <button className="icon-button danger-text" type="button" onClick={() => handleDelete(product.id)} title="Delete product">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
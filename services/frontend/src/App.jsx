import { useEffect, useMemo, useState } from 'react';
import {
  createOrder,
  createProduct,
  deleteProduct,
  getOrders,
  getProducts,
  updateProduct,
} from './api';

const emptyProduct = {
  name: '',
  category: '',
  price: '',
  stock: '',
};

const emptyOrder = {
  product_id: '',
  quantity: '',
};

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [editingProductId, setEditingProductId] = useState(null);
  const [status, setStatus] = useState('Loading platform data...');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refreshData() {
    setError('');
    try {
      const [productData, orderData] = await Promise.all([getProducts(), getOrders()]);
      setProducts(productData);
      setOrders(orderData);
      if (!orderForm.product_id && productData[0]) {
        setOrderForm((current) => ({ ...current, product_id: String(productData[0].id) }));
      }
      setStatus('Platform is connected and ready.');
    } catch (err) {
      setError(err.message);
      setStatus('Unable to load data from the services.');
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  const metrics = useMemo(
    () => [
      { label: 'Products', value: products.length },
      { label: 'Orders', value: orders.length },
      { label: 'Inventory Items', value: products.reduce((sum, item) => sum + Number(item.stock || 0), 0) },
    ],
    [products, orders],
  );

  function handleProductChange(event) {
    const { name, value } = event.target;
    setProductForm((current) => ({ ...current, [name]: value }));
  }

  function handleOrderChange(event) {
    const { name, value } = event.target;
    setOrderForm((current) => ({ ...current, [name]: value }));
  }

  function startEdit(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
    });
    setStatus(`Editing ${product.name}.`);
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(emptyProduct);
  }

  async function handleProductSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    const payload = {
      name: productForm.name.trim(),
      category: productForm.category.trim(),
      price: Number(productForm.price),
      stock: Number(productForm.stock),
    };

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
        setStatus('Product updated successfully.');
      } else {
        await createProduct(payload);
        setStatus('Product created successfully.');
      }
      resetProductForm();
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProduct(productId) {
    if (!window.confirm('Delete this product?')) {
      return;
    }

    setBusy(true);
    setError('');
    try {
      await deleteProduct(productId);
      setStatus('Product deleted.');
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleOrderSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createOrder({
        product_id: Number(orderForm.product_id),
        quantity: Number(orderForm.quantity),
      });
      setStatus('Order created successfully.');
      setOrderForm((current) => ({ ...current, quantity: '' }));
      await refreshData();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <div className="backdrop backdrop-a" />
      <div className="backdrop backdrop-b" />
      <main className="app">
        <section className="hero card">
          <div>
            <p className="eyebrow">Ecommerce Operations Console</p>
            <h1>Manage products and orders from one polished dashboard.</h1>
            <p className="hero-copy">
              A streamlined storefront control center for the product service and the order service,
              designed to be fast, clear, and presentation-ready.
            </p>
          </div>
          <div className="hero-panel">
            <div className="status-pill">{status}</div>
            <div className="metric-grid">
              {metrics.map((metric) => (
                <div className="metric" key={metric.label}>
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error ? <div className="alert">{error}</div> : null}

        <section className="content-grid">
          <article className="card form-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Catalog</p>
                <h2>{editingProductId ? 'Edit product' : 'Create product'}</h2>
              </div>
              {editingProductId ? (
                <button className="ghost-button" type="button" onClick={resetProductForm} disabled={busy}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form className="form" onSubmit={handleProductSubmit}>
              <label>
                <span>Product name</span>
                <input name="name" value={productForm.name} onChange={handleProductChange} placeholder="Wireless Headphones" required />
              </label>
              <label>
                <span>Category</span>
                <input name="category" value={productForm.category} onChange={handleProductChange} placeholder="Audio" required />
              </label>
              <div className="split">
                <label>
                  <span>Price</span>
                  <input name="price" type="number" step="0.01" min="0" value={productForm.price} onChange={handleProductChange} placeholder="99.99" required />
                </label>
                <label>
                  <span>Stock</span>
                  <input name="stock" type="number" min="0" value={productForm.stock} onChange={handleProductChange} placeholder="20" required />
                </label>
              </div>
              <button className="primary-button" type="submit" disabled={busy}>
                {editingProductId ? 'Update product' : 'Add product'}
              </button>
            </form>
          </article>

          <article className="card form-card">
            <div className="section-title">
              <div>
                <p className="eyebrow">Orders</p>
                <h2>Place a new order</h2>
              </div>
            </div>

            <form className="form" onSubmit={handleOrderSubmit}>
              <label>
                <span>Product</span>
                <select name="product_id" value={orderForm.product_id} onChange={handleOrderChange} required>
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      #{product.id} - {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Quantity</span>
                <input name="quantity" type="number" min="1" value={orderForm.quantity} onChange={handleOrderChange} placeholder="1" required />
              </label>
              <button className="primary-button accent" type="submit" disabled={busy || !products.length}>
                Submit order
              </button>
            </form>
          </article>
        </section>

        <section className="card list-card">
          <div className="section-title">
            <div>
              <p className="eyebrow">Product Catalog</p>
              <h2>Inventory overview</h2>
            </div>
            <button className="ghost-button" type="button" onClick={refreshData} disabled={busy}>
              Refresh data
            </button>
          </div>

          <div className="product-list">
            {products.map((product) => (
              <div className="product-item" key={product.id}>
                <div>
                  <div className="product-heading">
                    <h3>{product.name}</h3>
                    <span>#{product.id}</span>
                  </div>
                  <p>{product.category}</p>
                </div>
                <div className="product-meta">
                  <strong>{currency(product.price)}</strong>
                  <span>{product.stock} in stock</span>
                </div>
                <div className="row-actions">
                  <button className="ghost-button" type="button" onClick={() => startEdit(product)}>
                    Edit
                  </button>
                  <button className="danger-button" type="button" onClick={() => handleDeleteProduct(product.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!products.length ? <p className="empty-state">No products yet. Create the first item to populate the catalog.</p> : null}
          </div>
        </section>

        <section className="card list-card">
          <div className="section-title">
            <div>
              <p className="eyebrow">Order Feed</p>
              <h2>Recent orders</h2>
            </div>
          </div>

          <div className="order-list">
            {orders.map((order) => (
              <div className="order-item" key={order.id}>
                <div>
                  <strong>Order #{order.id}</strong>
                  <p>Product ID {order.product_id} · {order.quantity} unit(s)</p>
                </div>
                <span className={`status-badge status-${order.status}`}>{order.status}</span>
              </div>
            ))}
            {!orders.length ? <p className="empty-state">No orders placed yet. Use the order form to create one.</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}

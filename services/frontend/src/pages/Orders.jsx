import { useState, useEffect } from 'react';
import { getOrders, getProducts } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as toast from '../toast';
import { Package, Clock } from 'lucide-react';

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
      return;
    }

    const controller = new AbortController();

    async function fetchData() {
      try {
        const [ordersData, productsData] = await Promise.all([
          getOrders(user.email),
          getProducts(controller.signal),
        ]);

        // Map products for quick lookup
        const prodMap = {};
        productsData.forEach(p => { prodMap[p.id] = p; });

        setProducts(prodMap);
        setOrders(ordersData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Failed to load orders.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => controller.abort();
  }, [user, navigate]);

  return (
    <div className="page-container fade-in">
      <div className="section-header">
        <h2>My Orders</h2>
        <p className="hint">View and track your recent purchases</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <Package size={48} className="empty-icon" />
          <h3>No orders yet</h3>
          <p>When you place an order, it will appear here.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => {
            const product = products[order.product_id];
            return (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <div>
                    <span className="order-id">Order #{order.id}</span>
                    <span className="order-date">
                      <Clock size={14} /> 
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`status-badge status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-body">
                  <img src={product?.image || 'https://picsum.photos/100'} alt="Product" className="order-img" />
                  <div className="order-details">
                    <h4>{product ? product.name : `Product ID: ${order.product_id}`}</h4>
                    <p className="hint">Qty: {order.quantity}</p>
                    <p className="hint">Payment: <span style={{textTransform:'capitalize'}}>{order.payment_method || 'N/A'}</span></p>
                  </div>
                  <div className="order-price">
                    <strong>{product ? currency(product.price * order.quantity) : '-'}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

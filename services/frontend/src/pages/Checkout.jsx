import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import * as toast from '../toast';
import { CreditCard, DollarSign, Wallet, ShieldCheck, ArrowLeft, CheckCircle } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit Card', icon: <CreditCard size={24} /> },
  { id: 'paypal', name: 'PayPal', icon: <Wallet size={24} /> },
  { id: 'apple', name: 'Apple Pay', icon: <Wallet size={24} /> },
  { id: 'cod', name: 'Cash on Delivery', icon: <DollarSign size={24} /> },
];

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export function Checkout() {
  const { cart, total, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  // Guard redirects in useEffect — calling navigate() during render is a React anti-pattern
  useEffect(() => {
    if (!user) {
      navigate('/auth?mode=login');
    } else if (cart.items.length === 0 && !success) {
      navigate('/cart');
    }
  }, [user, cart.items.length, success, navigate]);

  const handlePay = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      // Simulate slight delay for processing animation
      await new Promise(r => setTimeout(r, 800));

      for (const item of cart.items) {
        await createOrder({
          product_id: Number(item.productId),
          quantity: Number(item.quantity),
          user_email: user.email,
          payment_method: selectedMethod,
        });
      }

      clear();
      setSuccess(true);
      toast.success('Order placed successfully!');
    } catch (err) {
      toast.error(err.message || 'Checkout failed.');
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="page-container checkout-success fade-in">
        <CheckCircle size={80} className="success-icon" />
        <h2>Payment Successful!</h2>
        <p>Thank you for your purchase. Your order is being processed.</p>
        <div className="success-actions">
          <Link to="/orders" className="primary-button">View My Orders</Link>
          <Link to="/" className="ghost-button">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      <div className="checkout-layout">
        <div className="checkout-left">
          <Link to="/cart" className="back-link"><ArrowLeft size={16} /> Back to Cart</Link>
          <h2>Secure Checkout</h2>
          
          <div className="payment-methods-section">
            <h3>Payment Method</h3>
            <div className="payment-grid">
              {PAYMENT_METHODS.map((method) => (
                <div 
                  key={method.id} 
                  className={`payment-card ${selectedMethod === method.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMethod(method.id)}
                >
                  <div className="payment-card-icon">{method.icon}</div>
                  <span className="payment-card-name">{method.name}</span>
                  <div className="radio-circle"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="checkout-right">
          <div className="cart-summary-card">
            <h3>Pay securely</h3>
            <div className="secure-badge">
              <ShieldCheck size={16} /> <span>256-bit encrypted checkout</span>
            </div>
            <div className="summary-row total mt-4">
              <span>Total to Pay</span>
              <span className="accent-text">{currency(total)}</span>
            </div>
            <button 
              className={`primary-button full-width pay-btn ${processing ? 'loading' : ''}`} 
              onClick={handlePay}
              disabled={processing || !selectedMethod}
            >
              {processing ? 'Processing...' : `Pay ${currency(total)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

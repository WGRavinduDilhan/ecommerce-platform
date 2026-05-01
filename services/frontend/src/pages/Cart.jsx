import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

function currency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export function Cart() {
  const { cart, remove, count, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      navigate('/auth?mode=login&redirect=/checkout');
    } else {
      navigate('/checkout');
    }
  };

  if (count === 0) {
    return (
      <div className="page-container empty-page fade-in">
        <div className="empty-cart-state">
          <ShoppingBag size={64} className="empty-icon" />
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything to your cart yet.</p>
          <Link to="/" className="primary-button mt-4">Start Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container fade-in">
      <div className="section-header">
        <h2>Your Shopping Cart</h2>
        <p className="hint">{count} {count === 1 ? 'item' : 'items'}</p>
      </div>

      <div className="cart-layout">
        <div className="cart-items-list">
          {cart.items.map((item) => (
            <div key={item.productId} className="cart-item-card">
              <img src={item.image || 'https://picsum.photos/100/100'} alt={item.name} className="cart-item-img" />
              <div className="cart-item-details">
                <h3>{item.name}</h3>
                <p className="hint">Qty: {item.quantity}</p>
              </div>
              <div className="cart-item-price">
                <strong>{currency(Number(item.price) * Number(item.quantity))}</strong>
                <button className="icon-button danger-text" onClick={() => remove(item.productId)} title="Remove item">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="cart-summary-card">
          <h3>Order Summary</h3>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{currency(total)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span>Free</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-row total">
            <span>Total</span>
            <span>{currency(total)}</span>
          </div>
          <button className="primary-button full-width checkout-btn" onClick={handleCheckout}>
            Proceed to Checkout <ArrowRight size={18} />
          </button>
          {!user && <p className="login-hint">You'll be asked to log in first.</p>}
        </div>
      </div>
    </div>
  );
}

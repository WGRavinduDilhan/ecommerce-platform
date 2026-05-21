import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import * as toast from '../toast';
import { ShoppingBag, Store } from 'lucide-react';

function currency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(Number(value || 0));
}

function getImageUrl(product) {
  if (product.image) return product.image;
  const seed = `${product.category || 'product'}-${product.name}`.toLowerCase().replace(/\s+/g, '-');
  return `https://picsum.photos/seed/ecom-${seed}/640/460`;
}

export function ProductCard({ product }) {
  const { add } = useCart();
  const { user } = useAuth();
  
  const handleAdd = () => {
    if (user?.role === 'admin') {
      toast.info('Admins cannot add to cart.');
      return;
    }
    add(product);
    toast.success('Added to cart');
  };

  const isOutOfStock = Number(product.stock) <= 0;

  return (
    <article className="product-card group">
      <div className="product-image-container">
        <img src={getImageUrl(product)} alt={product.name} className="product-image" loading="lazy" />
        {isOutOfStock && <div className="out-of-stock-overlay">Out of Stock</div>}
      </div>
      <div className="product-content">
        <div className="product-header">
          <p className="chip">{product.category || 'General'}</p>
          <span className="sku">#{product.id}</span>
        </div>
        <h3 className="product-title" title={product.name}>{product.name}</h3>
        <div className="product-meta-row">
          <span className="seller-chip">
            <Store size={14} />
            {product.seller_name || 'Eastlane Marketplace'}
          </span>
        </div>
        <div className="price-row">
          <strong className="product-price">{currency(product.price)}</strong>
          <span className="product-stock">{product.stock} left</span>
        </div>
        <button 
          className="add-to-cart-btn" 
          onClick={handleAdd} 
          disabled={isOutOfStock}
        >
          <ShoppingBag size={18} />
          {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
        </button>
      </div>
    </article>
  );
}

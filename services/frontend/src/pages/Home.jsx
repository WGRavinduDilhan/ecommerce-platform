import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts } from '../api';
import { ProductCard } from '../components/ProductCard';
import * as toast from '../toast';
import { Search, Store, Sparkles, TrendingUp } from 'lucide-react';

export function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProducts() {
      try {
        const data = await getProducts(controller.signal);
        setProducts(data);
      } catch (err) {
        // Ignore AbortError — caused by React StrictMode double-invoke cleanup
        if (err.name !== 'AbortError') {
          toast.error('Failed to load products.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => controller.abort();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

  const activeSellers = products.reduce((map, product) => {
    if (!product.seller_email) return map;
    if (!map[product.seller_email]) {
      map[product.seller_email] = {
        name: product.seller_name || 'Independent Seller',
        email: product.seller_email,
        count: 0,
      };
    }
    map[product.seller_email].count += 1;
    return map;
  }, {});

  const featuredSellers = Object.values(activeSellers).slice(0, 3);
  const inStockCount = products.filter(product => Number(product.stock) > 0).length;

  return (
    <div className="page-container fade-in">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">Discover Excellence</p>
          <h1>Elevate Your Lifestyle</h1>
          <p>Curated premium products designed to bring style, utility, and joy to your everyday life.</p>
          <div className="search-bar-container">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search products or categories..." 
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <strong>{products.length}</strong>
            <span>Premium Items</span>
          </div>
        </div>
      </section>

      <section className="market-strip">
        <div className="market-strip-card">
          <TrendingUp size={20} />
          <div>
            <strong>{inStockCount}</strong>
            <span>Items ready to ship</span>
          </div>
        </div>
        <div className="market-strip-card">
          <Store size={20} />
          <div>
            <strong>{featuredSellers.length || 1}</strong>
            <span>Active sellers</span>
          </div>
        </div>
        <Link className="market-strip-card market-strip-cta" to="/auth?mode=register&role=seller&redirect=/seller">
          <Sparkles size={20} />
          <div>
            <strong>Sell with us</strong>
            <span>Launch your own storefront</span>
          </div>
        </Link>
      </section>

      {featuredSellers.length > 0 && (
        <section className="sellers-section">
          <div className="section-header">
            <h2>Featured Sellers</h2>
            <p className="hint">Independent shops powering the marketplace</p>
          </div>
          <div className="seller-grid">
            {featuredSellers.map((seller) => (
              <article key={seller.email} className="seller-card">
                <div className="seller-card-badge"><Store size={16} /> Seller</div>
                <h3>{seller.name}</h3>
                <p>{seller.count} live products</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="products-section">
        <div className="section-header">
          <h2>Trending Collection</h2>
          <p className="hint">Showing {filteredProducts.length} items</p>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Curating products for you...</p>
          </div>
        ) : (
          <>
            {filteredProducts.length > 0 ? (
              <div className="products-grid">
                {filteredProducts.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={48} className="empty-icon" />
                <h3>No products found</h3>
                <p>Try adjusting your search terms.</p>
                <button className="text-button" onClick={() => setSearch('')}>Clear search</button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

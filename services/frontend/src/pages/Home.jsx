import { useState, useEffect } from 'react';
import { getProducts } from '../api';
import { ProductCard } from '../components/ProductCard';
import * as toast from '../toast';
import { Search } from 'lucide-react';

export function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        toast.error('Failed to load products.');
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.category && p.category.toLowerCase().includes(search.toLowerCase()))
  );

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

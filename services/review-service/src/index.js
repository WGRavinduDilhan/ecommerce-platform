require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost/reviewdb'
});

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        order_id INTEGER,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(200),
        content TEXT,
        verified_purchase BOOLEAN DEFAULT FALSE,
        helpful_count INTEGER DEFAULT 0,
        unhelpful_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS review_votes (
        id SERIAL PRIMARY KEY,
        review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        vote_type VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(review_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS review_responses (
        id SERIAL PRIMARY KEY,
        review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        seller_id INTEGER NOT NULL,
        response_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'review-service', timestamp: new Date() });
});

// ============ Review Routes ============

/**
 * GET /reviews/product/:productId
 * Get all reviews for a product
 * Query: { sort: 'helpful|recent|rating', page: 1, limit: 10 }
 */
app.get('/reviews/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { sort = 'recent', page = 1, limit = 10 } = req.query;

    // TODO: Query reviews from database
    // TODO: Apply sorting and pagination
    // TODO: Calculate average rating and count

    res.json({
      reviews: [
        {
          id: 1,
          productId,
          userId: 1,
          rating: 5,
          title: 'Great product!',
          content: 'Very satisfied with this purchase',
          verifiedPurchase: true,
          createdAt: new Date()
        }
      ],
      stats: {
        averageRating: 4.5,
        totalReviews: 10,
        ratingBreakdown: {
          5: 7,
          4: 2,
          3: 1,
          2: 0,
          1: 0
        }
      },
      pagination: { page, limit, total: 10 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /reviews
 * Submit a new review
 * Body: { productId, orderId, rating, title, content }
 * Headers: { Authorization: 'Bearer token' }
 */
app.post('/reviews', async (req, res) => {
  try {
    const { productId, orderId, rating, title, content } = req.body;

    // TODO: Validate rating (1-5)
    // TODO: Validate user hasn't already reviewed this product
    // TODO: Check if order exists for user (verified purchase)
    // TODO: Store review in database
    // TODO: Update product rating cache

    res.status(201).json({
      message: 'Review submitted for moderation',
      review: {
        id: 1,
        productId,
        rating,
        title,
        status: 'pending'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /reviews/:id
 * Update a review
 * Body: { rating, title, content }
 */
app.put('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, title, content } = req.body;

    // TODO: Verify user owns review
    // TODO: Update review in database
    // TODO: Mark as pending for re-moderation

    res.json({
      message: 'Review updated successfully',
      review: { id, rating, title }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /reviews/:id
 * Delete a review
 */
app.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Verify user owns review
    // TODO: Delete review from database
    // TODO: Update product rating cache

    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /reviews/:id/helpful
 * Mark review as helpful/unhelpful
 * Body: { isHelpful: boolean }
 */
app.post('/reviews/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;
    const { isHelpful } = req.body;

    // TODO: Check if user already voted
    // TODO: Record vote in database
    // TODO: Update helpful count

    res.json({
      message: 'Vote recorded',
      review: {
        id,
        helpfulCount: 10,
        unhelpfulCount: 2
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /reviews/:id/response
 * Seller responds to a review
 * Body: { responseText }
 */
app.post('/reviews/:id/response', async (req, res) => {
  try {
    const { id } = req.params;
    const { responseText } = req.body;

    // TODO: Verify seller owns product
    // TODO: Store response in database
    // TODO: Notify reviewer

    res.status(201).json({
      message: 'Response posted',
      response: {
        id: 1,
        reviewId: id,
        responseText,
        createdAt: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /reviews/trending
 * Get trending/popular reviews
 */
app.get('/reviews/trending', async (req, res) => {
  try {
    // TODO: Query most helpful/recent reviews
    res.json({
      reviews: []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/reviews/:id/approve
 * Admin: Approve a review
 */
app.post('/admin/reviews/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Verify admin role
    // TODO: Update review status to 'approved'
    // TODO: Update product rating cache

    res.json({ message: 'Review approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /admin/reviews/:id/reject
 * Admin: Reject a review with reason
 * Body: { reason }
 */
app.post('/admin/reviews/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // TODO: Verify admin role
    // TODO: Update review status to 'rejected'
    // TODO: Notify user

    res.json({ message: 'Review rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3003;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Review Service running on port ${PORT}`);
  });
});

module.exports = app;

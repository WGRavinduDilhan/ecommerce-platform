require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost/paymentdb'
});

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        transaction_id VARCHAR(100),
        gateway_response JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES payments(id),
        transaction_type VARCHAR(50),
        amount DECIMAL(12, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        reference_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS refunds (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES payments(id),
        amount DECIMAL(12, 2) NOT NULL,
        reason VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        processed_at TIMESTAMP NULL,
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
  res.json({ status: 'ok', service: 'payment-service', timestamp: new Date() });
});

// ============ Payment Routes ============

/**
 * POST /payments/process
 * Process payment with Stripe or PayPal
 * Body: { orderId, amount, paymentMethod, stripeToken or paypalToken }
 */
app.post('/payments/process', async (req, res) => {
  try {
    const { orderId, amount, paymentMethod, stripeToken, paypalToken } = req.body;

    if (paymentMethod === 'card' && stripeToken) {
      // TODO: Process with Stripe
      // const charge = await stripe.charges.create({...})
      // Store payment record
      res.status(201).json({
        message: 'Payment processed successfully',
        payment: {
          id: 1,
          orderId,
          amount,
          status: 'completed',
          transactionId: 'stripe_txn_123'
        }
      });
    } else if (paymentMethod === 'paypal' && paypalToken) {
      // TODO: Process with PayPal
      res.status(201).json({
        message: 'PayPal payment initiated',
        approval_url: 'https://paypal.com/approve...'
      });
    } else {
      res.status(400).json({ error: 'Invalid payment method or token' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /payments/:id
 * Get payment status
 */
app.get('/payments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Query payment from database
    res.json({
      payment: {
        id,
        amount: 100.00,
        status: 'completed',
        method: 'card'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /payments/:id/refund
 * Refund a payment
 * Body: { reason, amount }
 */
app.post('/payments/:id/refund', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, amount } = req.body;

    // TODO: Process refund with payment gateway
    // TODO: Update payment status
    // TODO: Create refund record

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: 1,
        paymentId: id,
        amount,
        status: 'completed'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /payments/order/:orderId
 * Get all payments for an order
 */
app.get('/payments/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // TODO: Query all payments for order
    res.json({
      payments: [
        {
          id: 1,
          orderId,
          amount: 100.00,
          status: 'completed'
        }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /webhooks/stripe
 * Handle Stripe webhook events
 */
app.post('/webhooks/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  try {
    // TODO: Verify webhook signature
    // TODO: Handle charge.succeeded, charge.failed, etc.
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /webhooks/paypal
 * Handle PayPal webhook events
 */
app.post('/webhooks/paypal', async (req, res) => {
  try {
    // TODO: Verify webhook signature
    // TODO: Handle PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, etc.
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3002;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Payment Service running on port ${PORT}`);
  });
});

module.exports = app;

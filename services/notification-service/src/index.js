require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const redis = require('redis');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost/notificationdb'
});

// Redis connection
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// Email configuration
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD
  }
});

// Twilio configuration
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        notification_type VARCHAR(50),
        title VARCHAR(255),
        content TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        is_archived BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        read_at TIMESTAMP NULL
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE,
        email_enabled BOOLEAN DEFAULT TRUE,
        sms_enabled BOOLEAN DEFAULT FALSE,
        push_enabled BOOLEAN DEFAULT TRUE,
        in_app_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS email_queue (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        template_name VARCHAR(100),
        template_data JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sms_queue (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        sent_at TIMESTAMP NULL,
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
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date() });
});

// ============ Notification Routes ============

/**
 * POST /notifications/email
 * Send email notification
 * Body: { userId, email, subject, template, templateData }
 */
app.post('/notifications/email', async (req, res) => {
  try {
    const { userId, email, subject, template, templateData } = req.body;

    // TODO: Check user notification preferences
    // TODO: Render email template with data
    // TODO: Send email via SendGrid or Gmail
    // TODO: Store in database

    res.status(201).json({
      message: 'Email queued for sending',
      notificationId: 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /notifications/sms
 * Send SMS notification
 * Body: { userId, phoneNumber, message }
 */
app.post('/notifications/sms', async (req, res) => {
  try {
    const { userId, phoneNumber, message } = req.body;

    // TODO: Check user notification preferences
    // TODO: Validate phone number
    // TODO: Send SMS via Twilio
    // TODO: Store in database

    res.status(201).json({
      message: 'SMS queued for sending',
      notificationId: 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /notifications/push
 * Send push notification
 * Body: { userId, title, message, data }
 */
app.post('/notifications/push', async (req, res) => {
  try {
    const { userId, title, message, data } = req.body;

    // TODO: Check user notification preferences
    // TODO: Get user's device tokens from Firebase
    // TODO: Send push notification via FCM
    // TODO: Store in database

    res.status(201).json({
      message: 'Push notification queued',
      notificationId: 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /notifications/in-app
 * Send in-app notification
 * Body: { userId, title, content, type }
 */
app.post('/notifications/in-app', async (req, res) => {
  try {
    const { userId, title, content, type } = req.body;

    // TODO: Store notification in database
    // TODO: If user is online, emit via Socket.io
    // TODO: Return notification

    res.status(201).json({
      message: 'In-app notification created',
      notification: {
        id: 1,
        userId,
        title,
        content,
        type,
        createdAt: new Date()
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /notifications
 * Get user's notifications
 * Query: { page: 1, limit: 20, unread: false }
 * Headers: { Authorization: 'Bearer token' }
 */
app.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 20, unread = false } = req.query;

    // TODO: Extract user from JWT
    // TODO: Query notifications from database
    // TODO: Apply pagination

    res.json({
      notifications: [
        {
          id: 1,
          title: 'Order Confirmed',
          content: 'Your order #123 has been confirmed',
          type: 'order',
          isRead: false,
          createdAt: new Date()
        }
      ],
      pagination: { page, limit, total: 10 }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /notifications/:id/read
 * Mark notification as read
 */
app.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Update notification status
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /notifications/read-all
 * Mark all notifications as read
 * Headers: { Authorization: 'Bearer token' }
 */
app.put('/notifications/read-all', async (req, res) => {
  try {
    // TODO: Extract user from JWT
    // TODO: Mark all user notifications as read

    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /notifications/:id
 * Delete/archive notification
 */
app.delete('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // TODO: Archive notification
    res.json({ message: 'Notification archived' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /notification-preferences
 * Get user's notification preferences
 * Headers: { Authorization: 'Bearer token' }
 */
app.get('/notification-preferences', async (req, res) => {
  try {
    // TODO: Extract user from JWT
    // TODO: Query preferences

    res.json({
      preferences: {
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /notification-preferences
 * Update user's notification preferences
 * Body: { emailEnabled, smsEnabled, pushEnabled, inAppEnabled }
 * Headers: { Authorization: 'Bearer token' }
 */
app.put('/notification-preferences', async (req, res) => {
  try {
    const { emailEnabled, smsEnabled, pushEnabled, inAppEnabled } = req.body;

    // TODO: Extract user from JWT
    // TODO: Update preferences in database

    res.json({
      message: 'Preferences updated',
      preferences: {
        emailEnabled,
        smsEnabled,
        pushEnabled,
        inAppEnabled
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /event
 * Receive event from other services and dispatch notifications
 * Body: { eventType, eventData }
 */
app.post('/event', async (req, res) => {
  try {
    const { eventType, eventData } = req.body;

    // Route events to appropriate handlers
    switch(eventType) {
      case 'order.created':
        // TODO: Send order confirmation email
        // TODO: Send in-app notification
        break;
      case 'order.shipped':
        // TODO: Send shipping notification
        // TODO: Send SMS with tracking number
        break;
      case 'order.delivered':
        // TODO: Send delivery notification
        // TODO: Request review
        break;
      case 'payment.received':
        // TODO: Send payment confirmation
        break;
      case 'product.back_in_stock':
        // TODO: Notify users with price alerts
        break;
      default:
        return res.status(400).json({ error: 'Unknown event type' });
    }

    res.json({ message: 'Event processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3006;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Notification Service running on port ${PORT}`);
  });
});

module.exports = app;

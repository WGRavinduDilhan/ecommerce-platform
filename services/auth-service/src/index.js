require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/auth/login', limiter);
app.use('/auth/register', limiter);

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost/authdb'
});

// Initialize database
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        profile_picture_url VARCHAR(500),
        date_of_birth DATE,
        is_email_verified BOOLEAN DEFAULT FALSE,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP NULL
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        access_token VARCHAR(1000) NOT NULL,
        refresh_token VARCHAR(1000),
        token_expires_at TIMESTAMP NOT NULL,
        device_info VARCHAR(500),
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL
      );

      CREATE TABLE IF NOT EXISTS oauth_connections (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        access_token VARCHAR(1000),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_user_id)
      );
    `);
    console.log('✓ Database initialized');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date() });
});

// ============ Authentication Routes ============

/**
 * POST /auth/register
 * Register new user
 * Body: { email, password, firstName, lastName }
 */
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // TODO: Implement password hashing with bcryptjs
    // TODO: Insert user into database
    // TODO: Generate JWT token
    // TODO: Send verification email

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: 1,
        email,
        firstName,
        lastName
      },
      token: 'jwt_token_here'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/login
 * User login with email and password
 * Body: { email, password }
 */
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // TODO: Validate credentials
    // TODO: Generate JWT token
    // TODO: Store session in database
    // TODO: Return tokens

    res.json({
      message: 'Login successful',
      accessToken: 'jwt_token',
      refreshToken: 'refresh_token',
      user: {
        id: 1,
        email,
        firstName: 'John'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/logout
 * User logout
 * Headers: { Authorization: 'Bearer token' }
 */
app.post('/auth/logout', async (req, res) => {
  try {
    // TODO: Invalidate token in database
    // TODO: Clear refresh token
    res.json({ message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/refresh-token
 * Refresh JWT token using refresh token
 * Body: { refreshToken }
 */
app.post('/auth/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // TODO: Validate refresh token
    // TODO: Generate new access token
    // TODO: Update session

    res.json({
      accessToken: 'new_jwt_token',
      refreshToken: 'new_refresh_token'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/forgot-password
 * Request password reset
 * Body: { email }
 */
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // TODO: Validate email exists
    // TODO: Generate reset token
    // TODO: Send reset email

    res.json({ message: 'Password reset link sent to email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/reset-password
 * Reset password with token
 * Body: { token, newPassword }
 */
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // TODO: Validate token
    // TODO: Update password
    // TODO: Invalidate token

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/oauth/:provider
 * OAuth login (Google, GitHub, Facebook)
 * Body: { oauthToken }
 */
app.post('/auth/oauth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { oauthToken } = req.body;

    // TODO: Verify OAuth token with provider
    // TODO: Find or create user
    // TODO: Generate JWT token

    res.json({
      message: 'OAuth login successful',
      accessToken: 'jwt_token',
      user: { id: 1, email: 'user@example.com' }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /auth/me
 * Get current user info
 * Headers: { Authorization: 'Bearer token' }
 */
app.get('/auth/me', async (req, res) => {
  try {
    // TODO: Extract user from JWT token
    res.json({
      user: {
        id: 1,
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/verify-token
 * Verify JWT token validity
 * Body: { token }
 */
app.post('/auth/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    // TODO: Validate token
    res.json({ valid: true, user: { id: 1 } });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

/**
 * POST /auth/2fa/setup
 * Enable Two-Factor Authentication
 * Headers: { Authorization: 'Bearer token' }
 */
app.post('/auth/2fa/setup', async (req, res) => {
  try {
    // TODO: Generate TOTP secret
    // TODO: Generate QR code
    // TODO: Store secret temporarily
    res.json({
      message: 'Scan QR code with authenticator app',
      qrCode: 'qr_code_url',
      secret: 'secret_here'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /auth/2fa/verify
 * Verify 2FA code and enable 2FA
 * Body: { code }
 */
app.post('/auth/2fa/verify', async (req, res) => {
  try {
    const { code } = req.body;

    // TODO: Verify TOTP code
    // TODO: Enable 2FA for user
    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /auth/profile
 * Update user profile
 * Headers: { Authorization: 'Bearer token' }
 * Body: { firstName, lastName, phone, dateOfBirth }
 */
app.put('/auth/profile', async (req, res) => {
  try {
    const { firstName, lastName, phone, dateOfBirth } = req.body;

    // TODO: Extract user from JWT
    // TODO: Update user in database

    res.json({
      message: 'Profile updated successfully',
      user: { id: 1, firstName, lastName, phone }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on port ${PORT}`);
  });
});

module.exports = app;

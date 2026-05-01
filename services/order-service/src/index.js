require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const axios = require('axios');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL || 'http://product-service:8000';

pool.query(`CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL, status VARCHAR(50) DEFAULT 'pending',
  user_email VARCHAR(255), payment_method VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
)`).catch(console.error);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));

app.post('/orders', async (req, res) => {
  const { product_id, quantity, user_email, payment_method } = req.body;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer' });
  }
  try {
    const { data: product } = await axios.get(`${PRODUCT_URL}/products/${product_id}`);
    if (product.stock < quantity)
      return res.status(400).json({ error: 'Insufficient stock' });
    const result = await pool.query(
      'INSERT INTO orders (product_id,quantity,status,user_email,payment_method) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [product_id, quantity, 'confirmed', user_email || null, payment_method || null]
    );
    await axios.put(`${PRODUCT_URL}/products/${product_id}`, {
      stock: product.stock - quantity,
    });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.response?.status === 404) return res.status(404).json({ error: 'Product not found' });
    res.status(500).json({ error: err.message });
  }
});
app.get('/orders', async (req,res) => {
  const { user_email } = req.query;
  let query = 'SELECT * FROM orders ORDER BY created_at DESC';
  let params = [];
  if (user_email) {
    query = 'SELECT * FROM orders WHERE user_email = $1 ORDER BY created_at DESC';
    params = [user_email];
  }
  res.json((await pool.query(query, params)).rows);
});
app.listen(3000, () => console.log('Order service on :3000'));
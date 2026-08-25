require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/init');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('❌ JWT_SECRET trop court (minimum 16 caractères)');
  process.exit(1);
}

const db = initDB();

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

app.use('/api/auth/login', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const ip = req.ip;
  const now = Date.now();
  const attempts = loginAttempts.get(ip) || [];
  const recent = attempts.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
  }
  recent.push(now);
  loginAttempts.set(ip, recent);
  next();
});

app.get('/admin.html', (req, res) => res.redirect(301, '/admin/index.html'));

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  }
}));

const createAuthRouter = require('./routes/auth');
const createCollectesRouter = require('./routes/collectes');
const createAdminRouter = require('./routes/admin');

app.use('/api/auth', createAuthRouter(db));
app.use('/api/collectes', createCollectesRouter(db));
app.use('/api/admin', createAdminRouter(db));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 4600;
app.listen(PORT, () => {
  console.log(`🚀 IPCE Dashboard running on port ${PORT}`);
});

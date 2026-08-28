// Marexsoft Corporation
const jwt = require('jsonwebtoken');

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(c => {
    const [key, ...val] = c.split('=');
    cookies[key.trim()] = val.join('=').trim();
  });
  return cookies;
}

// --- Token revocation (denylist) ---
// Tokens are keyed by their `jti` claim until their natural expiry.
const revokedTokens = new Map(); // jti -> expiry (ms)

function revokeToken(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti || typeof decoded.exp !== 'number') return;
    revokedTokens.set(decoded.jti, decoded.exp * 1000);
  } catch {
    // ignored — nothing to revoke if the token can't be decoded
  }
  cleanupRevoked();
}

function isTokenRevoked(token) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.jti) return false;
    return revokedTokens.has(decoded.jti);
  } catch {
    return false;
  }
}

function cleanupRevoked() {
  const now = Date.now();
  for (const [jti, expiry] of revokedTokens) {
    if (expiry <= now) revokedTokens.delete(jti);
  }
}

setInterval(cleanupRevoked, 10 * 60 * 1000).unref();

// --- Authentication ---
function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
// Marexsoft Corporation
  const cookies = parseCookies(req.headers.cookie);
  return cookies.token || null;
}

// Paths a user is allowed to call before changing their default password.
const PASSWORD_FREE_PATHS = new Set([
  '/change-password',
  '/logout',
  '/me',
  '/2fa/status',
]);

function authenticate(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Session expirée' });
  }

  if (isTokenRevoked(token)) {
    return res.status(401).json({ error: 'Session expirée' });
  }

  req.user = decoded;
  req.token = token;

  // Enforce must_change_password directly from the JWT claim — avoids a DB
  // round-trip on every authenticated request. The claim is refreshed on
  // login and on password change, so staleness is bounded by token lifetime.
  if (!PASSWORD_FREE_PATHS.has(req.path) && decoded.mustChangePassword) {
    // Double-check DB in case the JWT is stale after password change
    const db = req.app && req.app.get ? req.app.get('db') : null;
    if (db) {
      const row = db.prepare('SELECT must_change_password FROM users WHERE id = ?').get(decoded.id);
      if (row && row.must_change_password === 0) {
        // DB says password was changed — JWT is stale, allow the request
        return next();
      }
    }
    return res.status(403).json({ error: 'Veuillez d\'abord changer votre mot de passe' });
  }

  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, revokeToken, isTokenRevoked };
// Marexsoft Corporation

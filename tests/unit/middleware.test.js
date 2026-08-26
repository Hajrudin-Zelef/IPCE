const jwt = require('jsonwebtoken');
const { authenticate, requireRole } = require('../../middleware/auth');

function mockReq(cookie, authHeader) {
  return {
    headers: {
      cookie: cookie || '',
      authorization: authHeader || '',
    },
  };
}

function mockRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

const originalSecret = process.env.JWT_SECRET;
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
});
afterAll(() => {
  process.env.JWT_SECRET = originalSecret;
});

describe('authenticate middleware', () => {
  it('should reject request without token', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Non authentifié' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject invalid token', () => {
    const req = mockReq('', 'Bearer invalid-token');
    const res = mockRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should accept valid Bearer token', () => {
    const token = jwt.sign({ id: 1, nom: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const req = mockReq('', `Bearer ${token}`);
    const res = mockRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.nom).toBe('admin');
  });

  it('should accept valid cookie token', () => {
    const token = jwt.sign({ id: 2, nom: 'commercial', role: 'commercial' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const req = mockReq(`token=${token}`);
    const res = mockRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.role).toBe('commercial');
  });

  it('should reject expired token', () => {
    const token = jwt.sign({ id: 1, nom: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '-1h' });
    const req = mockReq('', `Bearer ${token}`);
    const res = mockRes();
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole middleware', () => {
  it('should allow matching role', () => {
    const req = { user: { role: 'admin' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject non-matching role', () => {
    const req = { user: { role: 'commercial' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

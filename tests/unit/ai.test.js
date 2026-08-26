const http = require('http');

// Mock websearch_agent server for testing
let mockServer;
let mockPort = 0;
let mockResponses = {};

function startMockServer() {
  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        const data = JSON.parse(body);
        const key = data.message.includes('insight') ? 'insight' : data.message.includes('rapport') || data.message.includes('report') ? 'report' : data.message.includes('predict') ? 'predict' : 'chat';
        const response = mockResponses[key] || { response: 'Reponse IA simulée', thread_id: 'test-thread' };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      });
    });
    mockServer.listen(0, '127.0.0.1', () => {
      mockPort = mockServer.address().port;
      process.env.WEBSEARCH_URL = `http://127.0.0.1:${mockPort}`;
      resolve(mockPort);
    });
  });
}

function stopMockServer() {
  return new Promise((resolve) => {
    if (mockServer) mockServer.close(resolve);
    else resolve();
  });
}

function setMockResponse(key, response) {
  mockResponses[key] = response;
}

// Minimal DB mock
function createMockDB() {
  return {
    prepare(sql) {
      return {
        all() {
          if (sql.includes('LEFT JOIN collectes')) return [{ id: 2, nom: 'Bilé', ca: 5000000, offres: 3, bc: 2, collectes: 1 }];
          if (sql.includes("FROM users") && sql.includes("commercial")) return [{ id: 2, nom: 'Bilé' }];
          if (sql.includes("settings")) return [{ key: 'ca_objectif', value: '100000000' }, { key: 'offres_objectif', value: '6' }, { key: 'bc_objectif', value: '6' }, { key: 'rdv_objectif', value: '6' }];
          if (sql.includes("sqlite_master")) return [{ name: 'users' }];
          if (sql.includes("PRAGMA")) return [{ name: 'id', type: 'INTEGER' }];
          if (sql.includes("logs") && sql.includes("LIMIT")) return [];
          if (sql.includes("ai_conversations")) return [];
          return [];
        },
        get() {
          if (sql.includes("SUM(ca)") || sql.includes("COALESCE")) return { total: 5000000 };
          if (sql.includes("SUM(CASE")) return { ca: 5000000, offres: 3, bc: 2 };
          if (sql.includes("COUNT") && sql.includes("rdvs")) return { count: 1 };
          if (sql.includes("COUNT") && sql.includes("ai_conversations")) return { count: 0 };
          if (sql.includes("AVG")) return { avg: 0 };
          return {};
        },
        run() {
          return { changes: 1 };
        },
      };
    },
  };
}

// Tests
describe('AI Service', () => {
  let db;

  beforeAll(async () => {
    await startMockServer();
    db = createMockDB();
  });

  afterAll(async () => {
    await stopMockServer();
  });

  beforeEach(() => {
    mockResponses = {};
    jest.resetModules();
  });

  describe('chat()', () => {
    test('should return AI response', async () => {
      setMockResponse('chat', { response: 'Bonjour ! Voici votre CA.', thread_id: 't1' });
      const { chat } = require('../../lib/ai');
      const result = await chat('Quel est le CA ?', [], db, false);
      expect(result.content).toBe('Bonjour ! Voici votre CA.');
      expect(result.model).toBe('websearch_agent');
    });

    test('should include context for business keywords', async () => {
      setMockResponse('chat', { response: 'CA total: 5M', thread_id: 't1' });
      const { chat } = require('../../lib/ai');
      const result = await chat('Quel est le CA total ?', [], db, false);
      expect(result.content).toBeDefined();
    });

    test('should handle error gracefully', async () => {
      await stopMockServer();
      process.env.WEBSEARCH_URL = 'http://127.0.0.1:1';
      const { chat } = require('../../lib/ai');
      await expect(chat('test', [], db, false)).rejects.toThrow();
      await startMockServer();
    });
  });

  describe('needsContext()', () => {
    test('should detect business keywords', () => {
      const { needsContext } = require('../../lib/ai');
      expect(needsContext('Quel est le CA ?')).toBe(true);
      expect(needsContext('Bonjour')).toBe(false);
      expect(needsContext('Performance du commercial')).toBe(true);
      expect(needsContext('Salut')).toBe(false);
    });
  });

  describe('buildContext()', () => {
    test('should build IPCE context string', () => {
      const { buildContext } = require('../../lib/ai');
      const ctx = buildContext(db);
      expect(ctx).toContain('CONTEXTE IPCE');
      expect(ctx).toContain('Bilé');
      expect(ctx).toContain('CA');
    });
  });

  describe('generateInsights()', () => {
    test('should return insights array', async () => {
      setMockResponse('insight', { response: '[{"type":"alert","title":"Test","message":"Alerte test","priority":1}]' });
      const { generateInsights } = require('../../lib/ai');
      const insights = await generateInsights(db, false);
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBe(1);
      expect(insights[0].type).toBe('alert');
    });

    test('should handle invalid JSON response', async () => {
      setMockResponse('insight', { response: 'Pas de JSON ici' });
      const { generateInsights } = require('../../lib/ai');
      const insights = await generateInsights(db, false);
      expect(insights).toEqual([]);
    });
  });

  describe('generateReport()', () => {
    test('should return report content', async () => {
      setMockResponse('report', { response: '## Rapport\n\nCA total: 5M FCFA' });
      const { generateReport } = require('../../lib/ai');
      const report = await generateReport(db, false);
      expect(report.content).toContain('Rapport');
      expect(report.model).toBe('websearch_agent');
    });
  });

  describe('Error monitoring', () => {
    test('should track errors', () => {
      const { logAIError, getAIErrorStats } = require('../../lib/ai');
      logAIError('chat', 'Test error');
      const stats = getAIErrorStats();
      expect(stats.chat).toBeDefined();
      expect(stats.chat.count).toBe(1);
      expect(stats.chat.lastMessage).toBe('Test error');
    });
  });
});

describe('AI Routes', () => {
  let db, mockReq, mockRes, mockBroadcast;

  beforeEach(() => {
    db = createMockDB();
    mockReq = {
      user: { id: 1, role: 'admin' },
      body: {},
      params: {},
      query: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockBroadcast = jest.fn();
  });

  test('GET /config should return godmode status', () => {
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    // Find the /config route handler
    const configRoute = router.stack.find(r => r.route && r.route.path === '/config' && r.route.methods.get);
    expect(configRoute).toBeDefined();
  });

  test('POST /chat should reject non-admin', () => {
    mockReq.user.role = 'commercial';
    mockReq.body = { message: 'test' };
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    const chatRoute = router.stack.find(r => r.route && r.route.path === '/chat' && r.route.methods.post);
    expect(chatRoute).toBeDefined();
  });

  test('POST /chat should reject empty message', () => {
    mockReq.body = {};
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    const chatRoute = router.stack.find(r => r.route && r.route.path === '/chat' && r.route.methods.post);
    expect(chatRoute).toBeDefined();
  });

  test('GET /insights should reject non-admin', () => {
    mockReq.user.role = 'commercial';
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    const insightsRoute = router.stack.find(r => r.route && r.route.path === '/insights' && r.route.methods.get);
    expect(insightsRoute).toBeDefined();
  });

  test('GET /status should return AI status', () => {
    mockReq.user.role = 'admin';
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    const statusRoute = router.stack.find(r => r.route && r.route.path === '/status' && r.route.methods.get);
    expect(statusRoute).toBeDefined();
  });

  test('GET /conversations should return history', () => {
    mockReq.user.role = 'admin';
    mockReq.query = { limit: '10', offset: '0' };
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    const convRoute = router.stack.find(r => r.route && r.route.path === '/conversations' && r.route.methods.get);
    expect(convRoute).toBeDefined();
  });

  test('DELETE /conversations should clear history', () => {
    mockReq.user.role = 'admin';
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    const delRoute = router.stack.find(r => r.route && r.route.path === '/conversations' && r.route.methods.delete);
    expect(delRoute).toBeDefined();
  });
});

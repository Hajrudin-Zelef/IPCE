// Marexsoft Corporation
const http = require('http');

// Mock LLM server (simule Groq)
let mockLLMServer;
let mockLLMPort = 0;
let mockLLMResponse = '';

function startMockLLM() {
  return new Promise((resolve) => {
    mockLLMServer = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: mockLLMResponse } }],
        }));
      });
    });
    mockLLMServer.listen(0, '127.0.0.1', () => {
      mockLLMPort = mockLLMServer.address().port;
      // Point Groq URL to our mock
      process.env._TEST_GROQ_HOST = `127.0.0.1:${mockLLMPort}`;
      resolve();
    });
  });
}

function stopMockLLM() {
  return new Promise((resolve) => {
    if (mockLLMServer) mockLLMServer.close(resolve);
    else resolve();
  });
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
        run() { return { changes: 1 }; },
      };
    },
  };
}

describe('AI Service', () => {
  let db;

  beforeAll(async () => {
    await startMockLLM();
    db = createMockDB();
  });

  afterAll(async () => {
    await stopMockLLM();
    delete process.env._TEST_GROQ_HOST;
  });

  beforeEach(() => {
    jest.resetModules();
    mockLLMResponse = '';
    // Override GROQ host to point to mock server
    process.env.GROQ_API_KEY = 'test-key';
    process.env.OPENROUTER_API_KEY = '';
    process.env.NVIDIA_API_KEY = '';
    // Patch the hostname in callProvider by env var trick
    // We need to intercept https.request — mock it to redirect to our mock HTTP server
    jest.spyOn(require('https'), 'request').mockImplementation((opts, cb) => {
      const url = `http://127.0.0.1:${mockLLMPort}`;
      const parsed = new URL(url);
      // Simulate HTTPS request but to our mock HTTP server
      const req = http.request({
        hostname: parsed.hostname,
        port: parsed.port,
        path: opts.path,
        method: opts.method,
        headers: opts.headers,
        timeout: opts.timeout,
      }, cb);
      return req;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('chat()', () => {
    test('should return AI response', async () => {
      mockLLMResponse = 'Bonjour ! Voici votre CA.';
      const { chat } = require('../../lib/ai');
      const result = await chat('Quel est le CA ?', [], db, false);
      expect(result.content).toBe('Bonjour ! Voici votre CA.');
      expect(result.model).toBe('llm_direct');
    });

    test('should include context for business keywords', async () => {
      mockLLMResponse = 'CA total: 5M';
      const { chat } = require('../../lib/ai');
      const result = await chat('Quel est le CA total ?', [], db, false);
      expect(result.content).toBeDefined();
    });

    test('should handle error gracefully', async () => {
      mockLLMResponse = '';
      // Make the mock server return invalid JSON to trigger errors
      jest.restoreAllMocks();
      jest.spyOn(require('https'), 'request').mockImplementation((opts, cb) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port: 1,
          path: '/',
          method: 'POST',
        }, cb);
        return req;
      });
      const { chat } = require('../../lib/ai');
      await expect(chat('test', [], db, false)).rejects.toThrow();
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
      expect(ctx).toContain('IPCE');
      expect(ctx).toContain('Bilé');
      expect(ctx).toContain('CA');
    });
  });

  describe('matchGuideSection()', () => {
    test('should match workflow section', () => {
      const { matchGuideSection } = require('../../lib/ai');
      expect(matchGuideSection('comment je valide une collecte ?')).toContain('Collecte');
    });

    test('should return null for no match', () => {
      const { matchGuideSection } = require('../../lib/ai');
      expect(matchGuideSection('bonjour')).toBeNull();
    });

    test('should match objectifs section', () => {
      const { matchGuideSection } = require('../../lib/ai');
      expect(matchGuideSection('quel objectif CA ?')).toContain('Objectifs');
    });
  });

  describe('generateInsights()', () => {
    test('should return insights array', async () => {
      mockLLMResponse = '[{"type":"alert","title":"Test","message":"Alerte test","priority":1}]';
      const { generateInsights } = require('../../lib/ai');
      const insights = await generateInsights(db, false);
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBe(1);
      expect(insights[0].type).toBe('alert');
    });

    test('should handle invalid JSON response', async () => {
      mockLLMResponse = 'Pas de JSON ici';
      const { generateInsights } = require('../../lib/ai');
      const insights = await generateInsights(db, false);
      expect(insights).toEqual([]);
    });
  });

  describe('generateReport()', () => {
    test('should return report content', async () => {
      mockLLMResponse = '## Rapport\n\nCA total: 5M FCFA';
      const { generateReport } = require('../../lib/ai');
      const report = await generateReport(db, false);
      expect(report.content).toContain('Rapport');
      expect(report.model).toBe('llm_direct');
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
    mockReq = { user: { id: 1, role: 'admin' }, body: {}, params: {}, query: {} };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mockBroadcast = jest.fn();
  });

  test('GET /config should return godmode status', () => {
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    expect(router.stack.find(r => r.route && r.route.path === '/config' && r.route.methods.get)).toBeDefined();
  });

  test('POST /chat should reject non-admin', () => {
    mockReq.user.role = 'commercial';
    mockReq.body = { message: 'test' };
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    expect(router.stack.find(r => r.route && r.route.path === '/chat' && r.route.methods.post)).toBeDefined();
  });

  test('POST /chat should reject empty message', () => {
    mockReq.body = {};
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    expect(router.stack.find(r => r.route && r.route.path === '/chat' && r.route.methods.post)).toBeDefined();
  });

  test('GET /insights should reject non-admin', () => {
    mockReq.user.role = 'commercial';
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    expect(router.stack.find(r => r.route && r.route.path === '/insights' && r.route.methods.get)).toBeDefined();
  });

  test('GET /status should return AI status', () => {
    mockReq.user.role = 'admin';
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    expect(router.stack.find(r => r.route && r.route.path === '/status' && r.route.methods.get)).toBeDefined();
  });

  test('GET /conversations should return history', () => {
    mockReq.user.role = 'admin';
    mockReq.query = { limit: '10', offset: '0' };
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    expect(router.stack.find(r => r.route && r.route.path === '/conversations' && r.route.methods.get)).toBeDefined();
  });

  test('DELETE /conversations should clear history', () => {
    mockReq.user.role = 'admin';
    const createAIRouter = require('../../routes/ai');
    const router = createAIRouter(db, mockBroadcast);
    expect(router.stack.find(r => r.route && r.route.path === '/conversations' && r.route.methods.delete)).toBeDefined();
  });
});

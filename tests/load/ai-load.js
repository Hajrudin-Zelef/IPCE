#!/usr/bin/env node
// Load test for IPCE AI endpoints
// Usage: node tests/load/ai-load.js [duration_seconds] [concurrency]

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4600';
const DURATION = parseInt(process.argv[2]) || 10;
const CONCURRENCY = parseInt(process.argv[3]) || 5;
const RESULTS = { success: 0, error: 0, timeouts: 0, latencies: [] };

function login() {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ nom: 'admin', password: process.env.ADMIN_PASSWORD || 'admin123' });
    const req = http.request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const cookies = res.headers['set-cookie'];
        const token = cookies ? cookies.find(c => c.startsWith('token='))?.split('=')[1]?.split(';')[0] : null;
        resolve(token);
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function hitEndpoint(path, token) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(`${BASE_URL}${path}`, {
      method: path.includes('chat') ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `token=${token}`,
      },
      timeout: 60000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const latency = Date.now() - start;
        RESULTS.latencies.push(latency);
        if (res.statusCode >= 200 && res.statusCode < 500) {
          RESULTS.success++;
        } else {
          RESULTS.error++;
        }
        resolve({ status: res.statusCode, latency, data: data.substring(0, 100) });
      });
    });
    req.on('error', () => { RESULTS.error++; resolve(null); });
    req.on('timeout', () => { RESULTS.timeouts++; req.destroy(); resolve(null); });
    if (path.includes('chat')) {
      req.write(JSON.stringify({ message: 'Quel est le CA total ?' }));
    }
    req.end();
  });
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

async function run() {
  console.log(`\n🔥 IPCE Load Test`);
  console.log(`   Duration: ${DURATION}s | Concurrency: ${CONCURRENCY} workers`);
  console.log(`   Target: ${BASE_URL}\n`);

  const token = await login();
  if (!token) {
    console.error('❌ Login failed. Set ADMIN_PASSWORD env var.');
    process.exit(1);
  }
  console.log('✅ Authenticated\n');

  const endpoints = [
    '/api/ai/status',
    '/api/health',
    '/api/ai/stored-insights',
  ];

  const startTime = Date.now();
  const workers = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push((async () => {
      while (Date.now() - startTime < DURATION * 1000) {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        await hitEndpoint(endpoint, token);
        // Small delay to simulate realistic traffic
        await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
      }
    })());
  }

  // Special worker for chat (slower, heavier endpoint)
  const chatWorker = (async () => {
    while (Date.now() - startTime < DURATION * 1000) {
      await hitEndpoint('/api/ai/chat', token);
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));
    }
  })();
  workers.push(chatWorker);

  await Promise.all(workers);

  // Results
  const total = RESULTS.success + RESULTS.error + RESULTS.timeouts;
  const avgLatency = RESULTS.latencies.length > 0
    ? Math.round(RESULTS.latencies.reduce((a, b) => a + b, 0) / RESULTS.latencies.length)
    : 0;

  console.log(`\n📊 Results (${DURATION}s)`);
  console.log(`   Total requests: ${total}`);
  console.log(`   Success: ${RESULTS.success} (${Math.round(RESULTS.success / total * 100)}%)`);
  console.log(`   Errors: ${RESULTS.error} (${Math.round(RESULTS.error / total * 100)}%)`);
  console.log(`   Timeouts: ${RESULTS.timeouts}`);
  console.log(`   RPS: ${Math.round(total / DURATION)}`);
  console.log(`\n   Latency:`);
  console.log(`     Avg: ${avgLatency}ms`);
  console.log(`     P50: ${percentile(RESULTS.latencies, 50)}ms`);
  console.log(`     P95: ${percentile(RESULTS.latencies, 95)}ms`);
  console.log(`     P99: ${percentile(RESULTS.latencies, 99)}ms`);
  console.log(`     Max: ${Math.max(...RESULTS.latencies)}ms`);
  console.log('');
}

run().catch(console.error);

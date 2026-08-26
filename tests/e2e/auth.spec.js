const { test, expect } = require('@playwright/test');

test.describe('Authentification', () => {
  test('login page should load', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Connexion/i);
  });

  test('API /api/auth/me should reject unauthenticated request', async ({ request }) => {
    const response = await request.get('/api/auth/me');
    expect(response.status()).toBe(401);
  });

  test('API /api/health should return ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('admin page should be accessible', async ({ page }) => {
    const response = await page.goto('/admin/index.html');
    expect(response?.status()).toBe(200);
  });

  test('dashboard page should be accessible', async ({ page }) => {
    const response = await page.goto('/dashboard.html');
    expect(response?.status()).toBe(200);
  });
});

test.describe('Dashboard Admin', () => {
  test('CSS files should be accessible', async ({ request }) => {
    const cssFiles = ['variables.css', 'base.css', 'sidebar.css', 'docs.css'];
    for (const file of cssFiles) {
      const response = await request.get(`/admin/css/${file}`);
      expect(response.status()).toBe(200);
    }
  });

  test('JS files should be accessible', async ({ request }) => {
    const jsFiles = ['app.js', 'sidebar.js', 'docs.js', 'settings.js'];
    for (const file of jsFiles) {
      const response = await request.get(`/admin/js/${file}`);
      expect(response.status()).toBe(200);
    }
  });

  test('logo images should be accessible', async ({ request }) => {
    const logos = ['logo-ipce-32.png', 'logo-ipce-64.png', 'logo-ipce-192.png'];
    for (const logo of logos) {
      const response = await request.get(`/admin/img/${logo}`);
      expect(response.status()).toBe(200);
    }
  });

  test('documentation files should be accessible', async ({ request }) => {
    const docs = ['Architecture.md', 'API.md', 'Auth.md'];
    for (const doc of docs) {
      const response = await request.get(`/docs/${doc}`);
      expect(response.status()).toBe(200);
    }
  });

  test('API endpoints should be protected', async ({ request }) => {
    const endpoints = ['/api/admin/stats', '/api/admin/users', '/api/admin/settings'];
    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });
});

test.describe('Collectes & RDV', () => {
  test('collectes API should require authentication', async ({ request }) => {
    const response = await request.get('/api/collectes');
    expect(response.status()).toBe(401);
  });

  test('RDV API should require authentication', async ({ request }) => {
    const response = await request.get('/api/collectes/rdvs');
    expect(response.status()).toBe(401);
  });

  test('POST collecte should require authentication', async ({ request }) => {
    const response = await request.post('/api/collectes', {
      data: { ca: 1000000, offres: 2, bc: 1, rdvs: [] },
    });
    expect(response.status()).toBe(401);
  });
});

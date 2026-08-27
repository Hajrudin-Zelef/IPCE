const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
require('dotenv').config();

function adminCookie() {
  const db = require('better-sqlite3')('data/ipce.db', { readonly: true });
  const admin = db.prepare("SELECT * FROM users WHERE role='admin' LIMIT 1").get();
  return jwt.sign({ id: admin.id, nom: admin.nom, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

test('Vue journalière — DOM complet', async ({ page, context }) => {
  const consoleLogs = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleLogs.push(msg.text());
  });
  page.on('pageerror', err => consoleLogs.push('PAGE ERROR: ' + err.message));

  await context.addCookies([{
    name: 'token',
    value: adminCookie(),
    domain: 'localhost',
    path: '/',
  }]);

  await page.goto('/admin/index.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => {
      localStorage.setItem('admin_verified_' + d.user.id, '1');
    });
  });
  await page.waitForTimeout(500);
  await page.goto('/admin/index.html');
  await page.waitForTimeout(2000);

  // Cliquer sur Vue journalière
  const navItem = page.locator('.sidebar-nav-item[data-section="daily"]');
  await expect(navItem).toBeVisible();
  await navItem.click();
  await page.waitForTimeout(3000);

  // Capturer le DOM complet de la section
  const sectionHTML = await page.locator('#section-daily-content').innerHTML();
  console.log('=== SECTION HTML LENGTH:', sectionHTML.length, '===');
  console.log('=== SECTION HTML (first 2000):', sectionHTML.slice(0, 2000), '===');
  console.log('=== CONSOLE ERRORS:', JSON.stringify(consoleLogs), '===');

  // Vérifier chaque élément
  const checks = {
    chips: await page.locator('.daily-chip').count(),
    donutCards: await page.locator('.daily-donut-card').count(),
    recentLists: await page.locator('.daily-recent').count(),
    calGrid: await page.locator('#daily-cal-grid').isVisible().catch(() => false),
    calGridHTML: await page.locator('#daily-cal-grid').innerHTML().catch(() => ''),
    dailyDetail: await page.locator('#daily-detail').isVisible().catch(() => false),
    dailyDetailHTML: await page.locator('#daily-detail').innerHTML().catch(() => ''),
    calDays: await page.locator('.daily-cal-day').count(),
    recentItems: await page.locator('.daily-recent .daily-collecte-item').count(),
  };
  console.log('=== ELEMENT CHECKS:', JSON.stringify(checks, null, 2), '===');

  await page.screenshot({ path: '/tmp/opencode/daily-screenshot.png', fullPage: true });
  console.log('Screenshot saved to /tmp/opencode/daily-screenshot.png');
});

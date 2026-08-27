const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
require('dotenv').config();

function adminCookie() {
  const db = require('better-sqlite3')('data/ipce.db', { readonly: true });
  const admin = db.prepare("SELECT * FROM users WHERE role='admin' LIMIT 1").get();
  return jwt.sign({ id: admin.id, nom: admin.nom, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

test('Admin header visible', async ({ page, context }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await context.addCookies([{ name: 'token', value: adminCookie(), domain: 'localhost', path: '/' }]);

  await page.goto('/admin/index.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => {
      localStorage.setItem('admin_verified_' + d.user.id, '1');
    });
  });
  await page.waitForTimeout(500);
  await page.goto('/admin/index.html');
  await page.waitForTimeout(3000);

  const headerVisible = await page.locator('.dashboard-header').isVisible().catch(() => false);
  const avatarEl = await page.locator('#user-avatar').textContent().catch(() => '');
  const avatarVisible = await page.locator('.header-avatar').isVisible().catch(() => false);
  const notifBell = await page.locator('#notif-bell').isVisible().catch(() => false);
  const notifWrapper = await page.locator('.notif-fixed-wrapper').isVisible().catch(() => false);
  const notifWrapperHTML = await page.locator('.notif-fixed-wrapper').innerHTML().catch(() => '');

  console.log('header:', headerVisible, '| avatar text:', avatarEl, '| avatar visible:', avatarVisible);
  console.log('notif-bell:', notifBell, '| notif-wrapper:', notifWrapper, '| notif html:', notifWrapperHTML.slice(0, 200));
  console.log('errors:', errors);

  await page.screenshot({ path: '/tmp/opencode/admin-header.png', fullPage: true });
});

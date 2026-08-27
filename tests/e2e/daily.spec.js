const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Génère un cookie d'authentification admin
function adminCookie() {
  const db = require('better-sqlite3')('data/ipce.db', { readonly: true });
  const admin = db.prepare("SELECT * FROM users WHERE role='admin' LIMIT 1").get();
  if (!admin) throw new Error('Aucun admin en base');
  return jwt.sign(
    { id: admin.id, nom: admin.nom, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

test.beforeEach(async ({ context }) => {
  const token = adminCookie();
  await context.addCookies([{
    name: 'token',
    value: token,
    domain: 'localhost',
    path: '/',
  }]);
});

test('Vue journalière — stats du jour + commerciaux récents', async ({ page }) => {
  // 1ère navigation : fixer le flag admin_verified
  await page.goto('/admin/index.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    // Récupérer l'id admin depuis /api/auth/me puis fixer le flag
    fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => {
      localStorage.setItem('admin_verified_' + d.user.id, '1');
    });
  });
  await page.waitForTimeout(500);
  // 2ème navigation : le guard passe
  await page.goto('/admin/index.html');
  await page.waitForTimeout(2000);

  await page.click('.sidebar-nav-item[data-section="daily"]');
  await page.waitForTimeout(2500);

  const section = page.locator('#section-daily-content');
  const text = await section.innerText();
  expect(text).not.toContain('Chargement...');
  expect(text).not.toContain('Erreur');

  // Libellés du JOUR (pas 30j) — labels en uppercase via CSS
  expect(text).toContain("CA AUJOURD'HUI");
  expect(text).toContain("COLLECTES DU JOUR");
  expect(text).not.toContain('30 j');
  expect(text).not.toContain('(30 jours)');

  // Liste des commerciaux récents présente
  await expect(page.locator('.daily-recent').first()).toBeVisible();

  // Liste des dernières collectes en bas
  const lastList = page.locator('.daily-recent', { hasText: 'Dernières collectes' });
  await expect(lastList).toBeVisible();
  await expect(lastList.locator('.daily-collecte-item').first()).toBeVisible();

  // Chips + calendrier
  await expect(page.locator('.daily-chip')).toHaveCount(4);
  await expect(page.locator('#daily-cal-grid')).toBeVisible();

  await page.click('.daily-cal-btn.today-btn');
  await page.waitForTimeout(500);
  await expect(page.locator('#daily-detail')).toBeVisible();
});

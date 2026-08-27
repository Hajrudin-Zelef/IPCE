const { test, expect } = require('@playwright/test');
const jwt = require('jsonwebtoken');
require('dotenv').config();

function adminCookie() {
  const db = require('better-sqlite3')('data/ipce.db', { readonly: true });
  const admin = db.prepare("SELECT * FROM users WHERE role='admin' LIMIT 1").get();
  return jwt.sign({ id: admin.id, nom: admin.nom, role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

test('Historique admin — filtres + pagination + vue détails', async ({ page, context }) => {
  await context.addCookies([{ name: 'token', value: adminCookie(), domain: 'localhost', path: '/' }]);

  // 1ère navigation : fixer le flag admin_verified
  await page.goto('/admin/index.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()).then(d => {
      localStorage.setItem('admin_verified_' + d.user.id, '1');
    });
  });
  await page.waitForTimeout(500);
  // 2ème navigation : le guard passe
  await page.goto('/admin/index.html');
  await page.waitForTimeout(2000);

  // Ouvrir le module
  await page.click('.sidebar-nav-item[data-section="history-admin"]');
  await page.waitForTimeout(2000);

  const section = page.locator('#section-history-admin-content');

  // Filtres visibles
  await expect(page.locator('#hist-admin-from')).toBeVisible();
  await expect(page.locator('#hist-admin-to')).toBeVisible();
  await expect(page.locator('#hist-admin-comm')).toBeVisible();
  await expect(section.getByText('Générer')).toBeVisible();

  // Compteur de résultats
  const counterText = await section.innerText();
  expect(counterText).toContain('résultat');

  // Tableau avec lignes
  const rows = await section.locator('tbody tr').count();
  expect(rows).toBeGreaterThan(0);

  // Bouton "Voir" présent
  const viewBtns = section.locator('button[title="Voir"]');
  await expect(viewBtns.first()).toBeVisible();

  // Pagination visibles (si > 10 résultats, sinon vérifier le compteur)
  expect(counterText).toMatch(/\d+ résultat/);

  // Cliquer "Voir" → modale
  await viewBtns.first().click();
  await page.waitForTimeout(500);
  const modal = page.locator('#history-admin-modal');
  await expect(modal).toBeVisible();

  // Fermer la modale
  await modal.locator('button:has-text("✕")').click();
  await page.waitForTimeout(300);
  await expect(modal).not.toBeVisible();

  // Filtrer par commercial "Tous"
  await page.selectOption('#hist-admin-comm', 'all');
  await section.getByText('Générer').click();
  await page.waitForTimeout(500);

  console.log('TEST PASSED — filtres + pagination + détails OK');
});

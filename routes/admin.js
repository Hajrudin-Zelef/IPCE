const express = require('express');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const { authenticate, requireRole } = require('../middleware/auth');

// Constant-time comparison for secrets (works for unequal lengths via hashing).
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// CSV cell escaping to prevent CSV/formula injection.
function escCsv(value) {
  let s = String(value === undefined || value === null ? '' : value);
  if (/^[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) {
    s = "'" + s;
  }
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function createAdminRouter(db) {
  const router = express.Router();

  // --- Notification helper ---
  function createNotification(userId, type, title, message, link) {
    db.prepare(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, type, title, message, link || null);
  }

  // Expose for other routers
  router._createNotification = createNotification;

  // --- Notifications API ---
  router.get('/notifications', authenticate, (req, res) => {
    const { unread_only, limit } = req.query;
    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];
    if (unread_only === 'true') { sql += ' AND is_read = 0'; }
    sql += ' ORDER BY created_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    else { sql += ' LIMIT 50'; }
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/notifications/unread-count', authenticate, (req, res) => {
    const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    res.json({ count: row.count });
  });

  router.patch('/notifications/:id/read', authenticate, (req, res) => {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!notif) return res.status(404).json({ error: 'Notification introuvable' });
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Marquee comme lue' });
  });

  router.patch('/notifications/read-all', authenticate, (req, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(req.user.id);
    res.json({ message: 'Toutes les notifications marquees comme lues' });
  });

  router.delete('/notifications/:id', authenticate, (req, res) => {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!notif) return res.status(404).json({ error: 'Notification introuvable' });
    db.prepare('DELETE FROM notifications WHERE id = ?').run(req.params.id);
    res.json({ message: 'Notification supprimee' });
  });

  router.delete('/notifications', authenticate, (req, res) => {
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'Toutes les notifications supprimees' });
  });

  router.get('/notifications/stats', authenticate, (req, res) => {
    const total = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ?').get(req.user.id).count;
    const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id).count;
    const byType = db.prepare(
      'SELECT type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY type'
    ).all(req.user.id);
    res.json({ total, unread, byType });
  });

  router.get('/stats', authenticate, requireRole('admin'), (req, res) => {
    const users = db.prepare('SELECT id, nom, role FROM users WHERE role = ?').all('commercial');

    const stats = users.map(u => {
      const collectes = db.prepare(
        'SELECT ca, offres, bc FROM collectes WHERE user_id = ? AND statut IN (?, ?)'
      ).all(u.id, 'validee', 'approuvee');

      const rdvCount = db.prepare(`
        SELECT COUNT(*) as count FROM rdvs r
        JOIN collectes c ON c.id = r.collecte_id
        WHERE c.user_id = ? AND c.statut IN (?, ?)
      `).get(u.id, 'validee', 'approuvee').count;

      const ca = collectes.reduce((s, c) => s + c.ca, 0);
      const offres = collectes.reduce((s, c) => s + c.offres, 0);
      const bc = collectes.reduce((s, c) => s + c.bc, 0);

      return { ...u, ca, offres, bc, rdvCount };
    });

    const totals = stats.reduce((acc, s) => ({
      ca: acc.ca + s.ca,
      offres: acc.offres + s.offres,
      bc: acc.bc + s.bc,
      rdvCount: acc.rdvCount + s.rdvCount,
    }), { ca: 0, offres: 0, bc: 0, rdvCount: 0 });

    res.json({ users: stats, totals });
  });

  router.get('/evolution', authenticate, requireRole('admin'), (req, res) => {
    const rows = db.prepare(`
      SELECT strftime('%Y-%m', c.created_at) as month,
        SUM(c.ca) as ca,
        SUM(c.offres) as offres,
        SUM(c.bc) as bc,
        COUNT(DISTINCT c.id) as collectes
      FROM collectes c
      WHERE c.statut IN ('validee', 'approuvee')
      GROUP BY month
      ORDER BY month ASC
    `).all();
    res.json(rows);
  });

  router.get('/pending', authenticate, requireRole('admin'), (req, res) => {
    const collectes = db.prepare(`
      SELECT c.*, u.nom as commercial,
        GROUP_CONCAT(
          json_object('id', r.id, 'prospect', r.prospect, 'date', r.date, 'montant', r.montant, 'statut', r.statut)
        ) as rdvs_raw
      FROM collectes c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN rdvs r ON r.collecte_id = c.id
      WHERE c.statut = 'validee'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    const result = collectes.map(c => ({
      ...c,
      rdvs: c.rdvs_raw ? JSON.parse(`[${c.rdvs_raw}]`) : [],
      rdvs_raw: undefined,
    }));

    res.json(result);
  });

  router.patch('/:id/approve', authenticate, requireRole('admin'), (req, res) => {
    const collecte = db.prepare('SELECT * FROM collectes WHERE id = ? AND statut = ?').get(req.params.id, 'validee');
    if (!collecte) {
      return res.status(404).json({ error: 'Collecte non trouvée ou déjà traitée' });
    }

    db.prepare('UPDATE collectes SET statut = ? WHERE id = ?').run('approuvee', req.params.id);
    db.prepare('INSERT INTO validation_history (collecte_id, user_id, action) VALUES (?, ?, ?)').run(req.params.id, req.user.id, 'approve');
    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'approve_collecte', 'collecte:' + req.params.id, 'Collecte approuvée');

    createNotification(
      collecte.user_id,
      'collecte_approved',
      'Collecte approuvee',
      `Votre collecte du ${new Date(collecte.created_at).toLocaleDateString('fr-FR')} a ete approuvee par l'admin.`,
      '#validation'
    );

    res.json({ message: 'Collecte approuvée' });
  });

  router.patch('/:id/reject', authenticate, requireRole('admin'), (req, res) => {
    const collecte = db.prepare('SELECT * FROM collectes WHERE id = ? AND statut = ?').get(req.params.id, 'validee');
    if (!collecte) {
      return res.status(404).json({ error: 'Collecte non trouvée ou déjà traitée' });
    }

    db.prepare('UPDATE collectes SET statut = ? WHERE id = ?').run('rejetee', req.params.id);
    db.prepare('INSERT INTO validation_history (collecte_id, user_id, action) VALUES (?, ?, ?)').run(req.params.id, req.user.id, 'reject');
    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'reject_collecte', 'collecte:' + req.params.id, 'Collecte rejetée');

    createNotification(
      collecte.user_id,
      'collecte_rejected',
      'Collecte rejetee',
      `Votre collecte du ${new Date(collecte.created_at).toLocaleDateString('fr-FR')} a ete rejetee par l'admin.`,
      '#validation'
    );

    res.json({ message: 'Collecte rejetée' });
  });

  router.get('/export', authenticate, requireRole('admin'), async (req, res) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IPCE Dashboard';
    workbook.created = new Date();

    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3C72' } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      },
    };

    const cellBorder = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };

    // Feuille 1 : Résumé exécutif
    const ws1 = workbook.addWorksheet('Résumé Exécutif');
    ws1.columns = [
      { header: 'Indicateur', key: 'indicateur', width: 30 },
      { header: 'Valeur', key: 'valeur', width: 20 },
      { header: 'Objectif', key: 'objectif', width: 20 },
      { header: 'Statut', key: 'statut', width: 15 },
    ];
    ws1.getRow(1).eachCell(cell => Object.assign(cell, headerStyle));
    ws1.getRow(1).eachCell(cell => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
      cell.border = cellBorder;
    });

    const users = db.prepare('SELECT id, nom FROM users WHERE role = ?').all('commercial');
    const allCollectes = db.prepare(`
      SELECT c.*, u.nom as commercial FROM collectes c
      JOIN users u ON u.id = c.user_id
      WHERE c.statut IN ('validee', 'approuvee')
    `).all();

    const totals = allCollectes.reduce((acc, c) => ({
      ca: acc.ca + c.ca,
      offres: acc.offres + c.offres,
      bc: acc.bc + c.bc,
    }), { ca: 0, offres: 0, bc: 0 });

    const rdvTotal = db.prepare(`
      SELECT COUNT(*) as count FROM rdvs r
      JOIN collectes c ON c.id = r.collecte_id
      WHERE c.statut IN ('validee', 'approuvee')
    `).get().count;

    const rows = [
      { indicateur: 'CA Total', valeur: `${(totals.ca / 1e6).toFixed(1)}M`, objectif: '100M', statut: totals.ca >= 1e8 ? '✓ OK' : totals.ca >= 7e7 ? '⚠ Suivi' : '✗ Alerte' },
      { indicateur: 'Offres Émises', valeur: totals.offres, objectif: '6', statut: totals.offres >= 6 ? '✓ OK' : totals.offres >= 4 ? '⚠ Suivi' : '✗ Alerte' },
      { indicateur: 'BC Signés', valeur: totals.bc, objectif: '6', statut: totals.bc >= 6 ? '✓ OK' : totals.bc >= 4 ? '⚠ Suivi' : '✗ Alerte' },
      { indicateur: 'RDV Total', valeur: rdvTotal, objectif: '6', statut: rdvTotal >= 6 ? '✓ OK' : rdvTotal >= 4 ? '⚠ Suivi' : '✗ Alerte' },
      { indicateur: 'Taux Conversion RDV→Offre', valeur: rdvTotal > 0 ? `${((totals.offres / rdvTotal) * 100).toFixed(0)}%` : '0%', objectif: '-', statut: '-' },
      { indicateur: 'Taux Fermeture Offre→BC', valeur: totals.offres > 0 ? `${((totals.bc / totals.offres) * 100).toFixed(0)}%` : '0%', objectif: '-', statut: '-' },
    ];

    rows.forEach(r => {
      const row = ws1.addRow(r);
      row.eachCell(cell => { cell.border = cellBorder; cell.alignment = { vertical: 'middle' }; });
    });

    // Feuille 2 : Détail par commercial
    const ws2 = workbook.addWorksheet('Détail par Commercial');
    ws2.columns = [
      { header: 'Commercial', key: 'nom', width: 20 },
      { header: 'CA (M FCFA)', key: 'ca', width: 15 },
      { header: 'Offres', key: 'offres', width: 10 },
      { header: 'BC Signés', key: 'bc', width: 12 },
      { header: 'RDV', key: 'rdv', width: 10 },
      { header: 'Conv RDV→Offre', key: 'conv', width: 18 },
      { header: 'Conv Offre→BC', key: 'convBC', width: 18 },
    ];
    ws2.getRow(1).eachCell(cell => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
      cell.border = cellBorder;
    });

    users.forEach(u => {
      const uc = allCollectes.filter(c => c.user_id === u.id);
      const ca = uc.reduce((s, c) => s + c.ca, 0);
      const offres = uc.reduce((s, c) => s + c.offres, 0);
      const bc = uc.reduce((s, c) => s + c.bc, 0);
      const rdv = db.prepare(`
        SELECT COUNT(*) as count FROM rdvs r
        JOIN collectes c ON c.id = r.collecte_id
        WHERE c.user_id = ? AND c.statut IN ('validee', 'approuvee')
      `).get(u.id).count;

      const row = ws2.addRow({
        nom: u.nom,
        ca: (ca / 1e6).toFixed(1),
        offres,
        bc,
        rdv,
        conv: rdv > 0 ? `${((offres / rdv) * 100).toFixed(0)}%` : '0%',
        convBC: offres > 0 ? `${((bc / offres) * 100).toFixed(0)}%` : '0%',
      });
      row.eachCell(cell => { cell.border = cellBorder; cell.alignment = { vertical: 'middle' }; });
    });

    // Feuille 3 : Liste des RDV
    const ws3 = workbook.addWorksheet('Détail RDV');
    ws3.columns = [
      { header: 'Commercial', key: 'commercial', width: 20 },
      { header: 'Prospect', key: 'prospect', width: 25 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Montant (M)', key: 'montant', width: 15 },
      { header: 'Statut', key: 'statut', width: 15 },
    ];
    ws3.getRow(1).eachCell(cell => {
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill;
      cell.alignment = headerStyle.alignment;
      cell.border = cellBorder;
    });

    const allRdvs = db.prepare(`
      SELECT r.*, u.nom as commercial FROM rdvs r
      JOIN collectes c ON c.id = r.collecte_id
      JOIN users u ON u.id = c.user_id
      WHERE c.statut IN ('validee', 'approuvee')
      ORDER BY r.date DESC
    `).all();

    allRdvs.forEach(r => {
      const row = ws3.addRow({
        commercial: r.commercial,
        prospect: r.prospect,
        date: r.date,
        montant: r.montant,
        statut: r.statut,
      });
      row.eachCell(cell => { cell.border = cellBorder; cell.alignment = { vertical: 'middle' }; });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_ipce_${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  });

  router.get('/export/csv', authenticate, requireRole('admin'), (req, res) => {
    const users = db.prepare('SELECT id, nom FROM users WHERE role = ?').all('commercial');
    const allCollectes = db.prepare(`
      SELECT c.*, u.nom as commercial FROM collectes c
      JOIN users u ON u.id = c.user_id
      WHERE c.statut IN ('validee', 'approuvee')
    `).all();

    const totals = allCollectes.reduce((acc, c) => ({
      ca: acc.ca + c.ca, offres: acc.offres + c.offres, bc: acc.bc + c.bc,
    }), { ca: 0, offres: 0, bc: 0 });

    const rdvTotal = db.prepare(`
      SELECT COUNT(*) as count FROM rdvs r
      JOIN collectes c ON c.id = r.collecte_id
      WHERE c.statut IN ('validee', 'approuvee')
    `).get().count;

    let csv = 'RAPPORT PILOTAGE COMMERCIAL IPCE\n';
    csv += new Date().toLocaleDateString('fr-FR') + '\n\n';
    csv += 'RESUME EXECUTIF\n';
    csv += 'CA TOTAL,' + escCsv(totals.ca) + ',Objectif 100M\n';
    csv += 'OFFRES EMISES,' + escCsv(totals.offres) + ',Objectif 6\n';
    csv += 'BC SIGNES,' + escCsv(totals.bc) + ',Objectif 6\n';
    csv += 'RDV,' + escCsv(rdvTotal) + ',Objectif 6\n\n';
    csv += 'DETAIL PAR COMMERCIALE\n';
    csv += 'Commerciale,CA,Offres,BC,RDV,Conv%\n';
    users.forEach(u => {
      const uc = allCollectes.filter(c => c.user_id === u.id);
      const ca = uc.reduce((s, c) => s + c.ca, 0);
      const offres = uc.reduce((s, c) => s + c.offres, 0);
      const bc = uc.reduce((s, c) => s + c.bc, 0);
      const rdv = db.prepare('SELECT COUNT(*) as count FROM rdvs r JOIN collectes c ON c.id = r.collecte_id WHERE c.user_id = ? AND c.statut IN (?, ?)').get(u.id, 'validee', 'approuvee').count;
      const conv = rdv > 0 ? ((offres / rdv) * 100).toFixed(0) : 0;
      csv += escCsv(u.nom) + ',' + escCsv(ca) + ',' + escCsv(offres) + ',' + escCsv(bc) + ',' + escCsv(rdv) + ',' + escCsv(conv) + '%\n';
    });
    csv += '\nDETAIL RDV\n';
    csv += 'Commerciale,Prospect,Date,Montant,Statut\n';
    const allRdvs = db.prepare(`
      SELECT r.*, u.nom as commercial FROM rdvs r
      JOIN collectes c ON c.id = r.collecte_id
      JOIN users u ON u.id = c.user_id
      WHERE c.statut IN ('validee', 'approuvee')
      ORDER BY r.date DESC
    `).all();
    allRdvs.forEach(r => {
      csv += escCsv(r.commercial) + ',' + escCsv(r.prospect) + ',' + escCsv(r.date) + ',' + escCsv(r.montant) + ',' + escCsv(r.statut) + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_ipce_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  });

  router.post('/reset', authenticate, requireRole('admin'), (req, res) => {
    const { confirmed } = req.body;
    if (confirmed !== true) return res.status(400).json({ error: 'Confirme avec { confirmed: true }' });

    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'ADMIN_PASSWORD manquant dans .env — reset annulé' });
    }

    const bcrypt = require('bcryptjs');
    const crypto = require('crypto');

    db.exec('DELETE FROM rdvs');
    db.exec('DELETE FROM collectes');
    db.prepare('UPDATE users SET must_change_password = 1').run();
    db.prepare('UPDATE users SET password = ? WHERE role = ?').run(
      bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12), 'admin'
    );

    const commerciaux = db.prepare('SELECT id, nom FROM users WHERE role = ?').all('commercial');
    for (const u of commerciaux) {
      const tempPass = crypto.randomBytes(9).toString('base64url');
      db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(tempPass, 12), u.id);
      console.log(`[RESET] Mot de passe temporaire pour "${u.nom}": ${tempPass}`);
    }

    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'reset_all', 'system', 'Réinitialisation complète de toutes les données');

    res.json({ message: 'Toutes les donnees ont ete reinitialisees' });
  });

  router.get('/rdvs', authenticate, requireRole('admin'), (req, res) => {
    const { commercial, statut, from, to } = req.query;
    let sql = `
      SELECT r.*, u.nom as commercial, c.id as collecte_id
      FROM rdvs r
      JOIN collectes c ON c.id = r.collecte_id
      JOIN users u ON u.id = c.user_id
      WHERE c.statut IN ('validee', 'approuvee')
    `;
    const params = [];
    if (commercial) { sql += ' AND u.nom = ?'; params.push(commercial); }
    if (statut) { sql += ' AND r.statut = ?'; params.push(statut); }
    if (from) { sql += ' AND r.date >= ?'; params.push(from); }
    if (to) { sql += ' AND r.date <= ?'; params.push(to); }
    sql += ' ORDER BY r.date DESC';
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/users', authenticate, requireRole('admin'), (req, res) => {
    const users = db.prepare('SELECT id, nom, role, must_change_password FROM users ORDER BY role, nom').all();
    res.json(users);
  });

  router.delete('/users/:id', authenticate, requireRole('admin'), (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Impossible de supprimer un admin' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'delete_user', 'user:' + req.params.id, `Utilisateur "${user.nom}" supprimé`);
    res.json({ message: 'Utilisateur supprimé' });
  });

  router.patch('/users/:id', authenticate, requireRole('admin'), (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    const { role, reset_password } = req.body;
    if (role) {
      if (!['admin', 'commercial'].includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
      db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'update_user', 'user:' + req.params.id, `Rôle de "${user.nom}" changé en ${role}`);
    }
    if (reset_password) {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync(reset_password, 12);
      db.prepare('UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?').run(hash, req.params.id);
      db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'reset_password', 'user:' + req.params.id, `Mot de passe de "${user.nom}" réinitialisé`);
    }
    res.json({ message: 'Utilisateur mis à jour' });
  });

  router.get('/reminders', authenticate, requireRole('admin'), (req, res) => {
    res.json(db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY due_date ASC').all(req.user.id));
  });

  router.post('/reminders', authenticate, requireRole('admin'), (req, res) => {
    const { title, description, due_date, priority } = req.body;
    if (!title) return res.status(400).json({ error: 'Titre requis' });
    const result = db.prepare(
      'INSERT INTO reminders (user_id, title, description, due_date, priority) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, title, description || null, due_date || null, priority || 'medium');

    // Create notification for the reminder
    if (due_date) {
      createNotification(
        req.user.id,
        'reminder',
        'Nouveau rappel cree',
        `Rappel : "${title}" prevu pour le ${new Date(due_date).toLocaleDateString('fr-FR')}.`,
        '#reminders'
      );
    }

    res.json({ id: result.lastInsertRowid, message: 'Rappel créé' });
  });

  router.patch('/reminders/:id', authenticate, requireRole('admin'), (req, res) => {
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Rappel non trouvé' });
    const { title, description, due_date, priority, completed } = req.body;
    if (title !== undefined) db.prepare('UPDATE reminders SET title = ? WHERE id = ?').run(title, req.params.id);
    if (description !== undefined) db.prepare('UPDATE reminders SET description = ? WHERE id = ?').run(description, req.params.id);
    if (due_date !== undefined) db.prepare('UPDATE reminders SET due_date = ? WHERE id = ?').run(due_date, req.params.id);
    if (priority !== undefined) db.prepare('UPDATE reminders SET priority = ? WHERE id = ?').run(priority, req.params.id);
    if (completed !== undefined) db.prepare('UPDATE reminders SET completed = ? WHERE id = ?').run(completed ? 1 : 0, req.params.id);
    res.json({ message: 'Rappel mis à jour' });
  });

  router.delete('/reminders/:id', authenticate, requireRole('admin'), (req, res) => {
    const reminder = db.prepare('SELECT * FROM reminders WHERE id = ?').get(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Rappel non trouvé' });
    db.prepare('DELETE FROM reminders WHERE id = ?').run(req.params.id);
    res.json({ message: 'Rappel supprimé' });
  });

  router.get('/logs', authenticate, requireRole('admin'), (req, res) => {
    const { action, user_id, limit } = req.query;
    let sql = 'SELECT l.*, u.nom as user_nom FROM logs l LEFT JOIN users u ON u.id = l.user_id';
    const conditions = [];
    const params = [];
    if (action) { conditions.push('l.action = ?'); params.push(action); }
    if (user_id) { conditions.push('l.user_id = ?'); params.push(user_id); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY l.created_at DESC';
    if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
    else { sql += ' LIMIT 100'; }
    res.json(db.prepare(sql).all(...params));
  });

  router.get('/settings', authenticate, requireRole('admin'), (req, res) => {
    const rows = db.prepare('SELECT * FROM settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  });

  router.patch('/settings', authenticate, requireRole('admin'), (req, res) => {
    const updates = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        upsert.run(key, String(value));
      }
    });
    tx();
    const keys = Object.keys(updates).join(', ');
    db.prepare('INSERT INTO logs (user_id, action, target, details) VALUES (?, ?, ?, ?)').run(req.user.id, 'update_settings', 'settings', `Paramètres mis à jour : ${keys}`);
    res.json({ message: 'Paramètres mis à jour' });
  });

  router.get('/history', authenticate, requireRole('admin'), (req, res) => {
    const { collecte_id, action } = req.query;
    let sql = `
      SELECT vh.*, u.nom as user_nom, c.user_id as commercial_id, cu.nom as commercial
      FROM validation_history vh
      JOIN users u ON u.id = vh.user_id
      JOIN collectes c ON c.id = vh.collecte_id
      JOIN users cu ON cu.id = c.user_id
    `;
    const conditions = [];
    const params = [];
    if (collecte_id) { conditions.push('vh.collecte_id = ?'); params.push(collecte_id); }
    if (action) { conditions.push('vh.action = ?'); params.push(action); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY vh.created_at DESC LIMIT 100';
    res.json(db.prepare(sql).all(...params));
  });

  // --- Admin Delete Collecte (override user scope) ---
  router.delete('/collectes/:id', authenticate, requireRole('admin'), (req, res) => {
    const { password } = req.body;
    if (!password || !process.env.ADMIN_SECRET || !safeEqual(password, process.env.ADMIN_SECRET)) {
      return res.status(403).json({ error: 'Mot de passe admin incorrect' });
    }
    const collecte = db.prepare('SELECT * FROM collectes WHERE id = ?').get(req.params.id);
    if (!collecte) return res.status(404).json({ error: 'Collecte non trouvée' });
    db.prepare('DELETE FROM rdvs WHERE collecte_id = ?').run(req.params.id);
    db.prepare('DELETE FROM collectes WHERE id = ?').run(req.params.id);
    res.json({ message: 'Collecte supprimée' });
  });

  return router;
}

module.exports = createAdminRouter;

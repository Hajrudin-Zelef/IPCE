const express = require('express');
const { authenticate } = require('../middleware/auth');
const { sendValidationEmail } = require('../email/mailer');

function createCollectesRouter(db) {
  const router = express.Router();

  router.get('/', authenticate, (req, res) => {
    const collectes = db.prepare(`
      SELECT c.*, GROUP_CONCAT(
        json_object('id', r.id, 'prospect', r.prospect, 'date', r.date, 'montant', r.montant, 'statut', r.statut)
      ) as rdvs_raw
      FROM collectes c
      LEFT JOIN rdvs r ON r.collecte_id = c.id
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all(req.user.id);

    const result = collectes.map(c => ({
      ...c,
      rdvs: c.rdvs_raw ? JSON.parse(`[${c.rdvs_raw}]`) : [],
      rdvs_raw: undefined,
    }));

    res.json(result);
  });

  router.get('/all', authenticate, (req, res) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const collectes = db.prepare(`
      SELECT c.*, u.nom as commercial,
        GROUP_CONCAT(
          json_object('id', r.id, 'prospect', r.prospect, 'date', r.date, 'montant', r.montant, 'statut', r.statut)
        ) as rdvs_raw
      FROM collectes c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN rdvs r ON r.collecte_id = c.id
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

  router.post('/', authenticate, (req, res) => {
    if (req.user.role !== 'commercial') {
      return res.status(403).json({ error: 'Seuls les commerciaux peuvent créer des collectes' });
    }

    const { ca, offres, bc, rdvs } = req.body;
    const result = db.prepare(
      'INSERT INTO collectes (user_id, ca, offres, bc) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, ca || 0, offres || 0, bc || 0);

    const collecteId = result.lastInsertRowid;

    if (Array.isArray(rdvs)) {
      const insertRdv = db.prepare(
        'INSERT INTO rdvs (collecte_id, prospect, date, montant, statut) VALUES (?, ?, ?, ?, ?)'
      );
      for (const r of rdvs) {
        insertRdv.run(collecteId, r.prospect, r.date, r.montant || 0, r.statut || 'Prévu');
      }
    }

    res.status(201).json({ id: collecteId, message: 'Collecte créée' });
  });

  router.put('/:id', authenticate, (req, res) => {
    const collecte = db.prepare('SELECT * FROM collectes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!collecte) {
      return res.status(404).json({ error: 'Collecte non trouvée' });
    }
    if (collecte.statut !== 'brouillon') {
      return res.status(400).json({ error: 'Impossible de modifier une collecte déjà validée' });
    }

    const { ca, offres, bc, rdvs } = req.body;
    db.prepare('UPDATE collectes SET ca = ?, offres = ?, bc = ? WHERE id = ?')
      .run(ca || 0, offres || 0, bc || 0, req.params.id);

    if (Array.isArray(rdvs)) {
      db.prepare('DELETE FROM rdvs WHERE collecte_id = ?').run(req.params.id);
      const insertRdv = db.prepare(
        'INSERT INTO rdvs (collecte_id, prospect, date, montant, statut) VALUES (?, ?, ?, ?, ?)'
      );
      for (const r of rdvs) {
        insertRdv.run(req.params.id, r.prospect, r.date, r.montant || 0, r.statut || 'Prévu');
      }
    }

    res.json({ message: 'Collecte mise à jour' });
  });

  router.delete('/:id', authenticate, (req, res) => {
    const collecte = db.prepare('SELECT * FROM collectes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!collecte) {
      return res.status(404).json({ error: 'Collecte non trouvée' });
    }
    if (collecte.statut !== 'brouillon') {
      return res.status(400).json({ error: 'Impossible de supprimer une collecte déjà validée' });
    }

    db.prepare('DELETE FROM rdvs WHERE collecte_id = ?').run(req.params.id);
    db.prepare('DELETE FROM collectes WHERE id = ?').run(req.params.id);

    res.json({ message: 'Collecte supprimée' });
  });

  router.patch('/:id/validate', authenticate, (req, res) => {
    if (req.user.role !== 'commercial') {
      return res.status(403).json({ error: 'Seuls les commerciaux peuvent valider' });
    }

    const collecte = db.prepare('SELECT * FROM collectes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!collecte) {
      return res.status(404).json({ error: 'Collecte non trouvée' });
    }
    if (collecte.statut !== 'brouillon') {
      return res.status(400).json({ error: 'Collecte déjà validée' });
    }

    db.prepare('UPDATE collectes SET statut = ? WHERE id = ?').run('validee', req.params.id);

    const rdvCount = db.prepare('SELECT COUNT(*) as count FROM rdvs WHERE collecte_id = ?').get(req.params.id).count;

    sendValidationEmail({
      commercialNom: req.user.nom,
      ca: collecte.ca,
      offres: collecte.offres,
      bc: collecte.bc,
      rdvCount,
    });

    // Notify all admins
    const admins = db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    const insertNotif = db.prepare(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)'
    );
    for (const admin of admins) {
      insertNotif.run(
        admin.id,
        'collecte_pending',
        'Nouvelle collecte a valider',
        `${req.user.nom} a soumis une collecte de ${(collecte.ca / 1e6).toFixed(1)}M FCFA — ${collecte.offres} offres, ${collecte.bc} BC, ${rdvCount} RDV.`,
        '#validation'
      );
    }

    res.json({ message: 'Collecte validée — notification envoyée à l\'administrateur' });
  });

  // --- RDV Calendar Endpoints ---

  router.get('/rdvs', authenticate, (req, res) => {
    const { from, to } = req.query;
    let sql = `
      SELECT r.id, r.prospect, r.date, r.montant, r.statut, r.collecte_id, c.statut as collecte_statut
      FROM rdvs r
      JOIN collectes c ON c.id = r.collecte_id
      WHERE c.user_id = ?
    `;
    const params = [req.user.id];

    if (from) {
      sql += ` AND r.date >= ?`;
      params.push(from);
    }
    if (to) {
      sql += ` AND r.date <= ?`;
      params.push(to);
    }

    sql += ` ORDER BY r.date ASC`;
    const rdvs = db.prepare(sql).all(...params);
    res.json(rdvs);
  });

  router.patch('/rdvs/:id', authenticate, (req, res) => {
    const rdv = db.prepare(`
      SELECT r.*, c.statut as collecte_statut, c.user_id
      FROM rdvs r JOIN collectes c ON c.id = r.collecte_id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!rdv) return res.status(404).json({ error: 'RDV non trouvé' });
    if (rdv.user_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
    if (rdv.collecte_statut !== 'brouillon') {
      return res.status(400).json({ error: 'Impossible de modifier un RDV d\'une collecte déjà validée' });
    }

    const { statut } = req.body;
    const allowed = ['Prevu', 'Realise', 'Offre', 'BC Signe'];
    if (!allowed.includes(statut)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    db.prepare('UPDATE rdvs SET statut = ? WHERE id = ?').run(statut, req.params.id);
    res.json({ message: 'Statut mis à jour' });
  });

  router.delete('/rdvs/:id', authenticate, (req, res) => {
    const rdv = db.prepare(`
      SELECT r.*, c.statut as collecte_statut, c.user_id
      FROM rdvs r JOIN collectes c ON c.id = r.collecte_id
      WHERE r.id = ?
    `).get(req.params.id);

    if (!rdv) return res.status(404).json({ error: 'RDV non trouvé' });
    if (rdv.user_id !== req.user.id) return res.status(403).json({ error: 'Accès refusé' });
    if (rdv.collecte_statut !== 'brouillon') {
      return res.status(400).json({ error: 'Impossible de supprimer un RDV d\'une collecte déjà validée' });
    }

    db.prepare('DELETE FROM rdvs WHERE id = ?').run(req.params.id);
    res.json({ message: 'RDV supprimé' });
  });

  return router;
}

module.exports = createCollectesRouter;

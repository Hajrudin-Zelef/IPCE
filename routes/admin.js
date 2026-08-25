const express = require('express');
const ExcelJS = require('exceljs');
const { authenticate, requireRole } = require('../middleware/auth');

function createAdminRouter(db) {
  const router = express.Router();

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
    res.json({ message: 'Collecte approuvée' });
  });

  router.patch('/:id/reject', authenticate, requireRole('admin'), (req, res) => {
    const collecte = db.prepare('SELECT * FROM collectes WHERE id = ? AND statut = ?').get(req.params.id, 'validee');
    if (!collecte) {
      return res.status(404).json({ error: 'Collecte non trouvée ou déjà traitée' });
    }

    db.prepare('UPDATE collectes SET statut = ? WHERE id = ?').run('rejetee', req.params.id);
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

  return router;
}

module.exports = createAdminRouter;

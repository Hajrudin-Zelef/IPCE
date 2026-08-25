# Plan: Module Calendrier pour Dashboard Utilisateur

## Contexte

L'interface admin possède déjà un calendrier (`/admin/js/calendar.js` + `calendar.css`) et une vue pipeline (`/admin/js/prospects.js`), mais **aucun équivalent n'existe pour les commerciaux**. Le dashboard utilisateur (`public/dashboard.html`) permet uniquement de créer des RDV au sein d'une collecte — il n'y a pas de vue calendaire, pas de modification/suppression de RDV après soumission, et pas d'endpoint API pour récupérer les RDVs de manière indépendante.

## Objectif

Ajouter un module calendrier dans `dashboard.html` avec :
- **Vue mois** : grille calendaire mensuelle avec les RDV affichés comme pastilles/étiquettes sur les dates
- **Vue timeline** : liste chronologique des RDV à venir et passés
- **Toggle** entre les deux vues
- **Actions** : voir les détails, modifier le statut (Prevu → Realise → Offre → BC Signe), supprimer un RDV
- **Navigation** : prev/next mois pour la vue calendrier

## Fichiers à modifier/créer

### Backend (2 fichiers)

#### 1. `routes/collectes.js` — Ajouter 3 endpoints

```javascript
// GET /api/collectes/rdvs?from=YYYY-MM-DD&to=YYYY-MM-DD
// Récupère tous les RDVs de l'utilisateur courant, avec filtres optionnels
// Retourne: [{ id, prospect, date, montant, statut, collecte_id, collecte_statut }]

// PATCH /api/collectes/rdvs/:id
// Modifie le statut d'un RDV (seulement si la collecte parente est en brouillon)
// Body: { statut: 'Prevu'|'Realise'|'Offre'|'BC Signe' }

// DELETE /api/collectes/rdvs/:id
// Supprime un RDV (seulement si la collecte parente est en brouillon)
```

**Contraintes** :
- L'utilisateur doit être propriétaire de la collecte parente
- On ne peut modifier/supprimer un RDV que si sa collecte est en statut `brouillon`
- Les RDVs de collectes validées/approuvées sont en lecture seule

#### 2. `server.js` — Aucune modification nécessaire
Les routes sont déjà montées via `createCollectesRouter(db)`.

### Frontend (1 fichier)

#### 3. `public/dashboard.html` — Ajouter le module calendrier

**Emplacement** : Après la section "Mes Graphiques", avant la fin du `<script>` inline.

**Structure HTML à ajouter** :
```html
<!-- Section Calendrier -->
<div class="section">Mon Calendrier</div>
<div class="card">
  <!-- Toggle Vue Mois / Timeline -->
  <div class="cal-toggle">
    <button class="cal-toggle-btn active" data-view="month">Vue Mois</button>
    <button class="cal-toggle-btn" data-view="timeline">Timeline</button>
  </div>

  <!-- Navigation mois -->
  <div class="cal-nav">
    <button class="btn btn-sm" onclick="calPrevMonth()">◀</button>
    <span id="cal-month-label">Août 2026</span>
    <button class="btn btn-sm" onclick="calNextMonth()">▶</button>
  </div>

  <!-- Vue Mois (grille) -->
  <div id="cal-month-view">
    <div class="cal-grid">
      <!-- 7 colonnes Lun-Dim, 5-6 lignes -->
      <!-- Chaque case: <div class="cal-day" data-date="YYYY-MM-DD"> -->
      <!--   <span class="cal-day-num">15</span> -->
      <!--   <div class="cal-dots"> -->
      <!--     <span class="cal-dot [status-class]"></span> -->
      <!--   </div> -->
      <!-- </div> -->
    </div>
  </div>

  <!-- Vue Timeline (liste) -->
  <div id="cal-timeline-view" style="display:none;">
    <div id="cal-timeline-list">
      <!-- Généré dynamiquement -->
    </div>
  </div>
</div>

<!-- Modal Détails RDV -->
<div class="cal-modal-overlay" id="cal-modal" style="display:none;">
  <div class="cal-modal">
    <div class="cal-modal-header">
      <h3>Détails du RDV</h3>
      <button class="cal-modal-close" onclick="calCloseModal()">✕</button>
    </div>
    <div class="cal-modal-body">
      <div class="cal-modal-field">
        <label>Prospect</label>
        <span id="cal-modal-prospect"></span>
      </div>
      <div class="cal-modal-field">
        <label>Date</label>
        <span id="cal-modal-date"></span>
      </div>
      <div class="cal-modal-field">
        <label>Montant</label>
        <span id="cal-modal-montant"></span>
      </div>
      <div class="cal-modal-field">
        <label>Statut</label>
        <select id="cal-modal-statut" class="cal-statut-select">
          <option value="Prevu">Prévu</option>
          <option value="Realise">Réalisé</option>
          <option value="Offre">Offre</option>
          <option value="BC Signe">BC Signé</option>
        </select>
      </div>
    </div>
    <div class="cal-modal-actions">
      <button class="btn btn-success btn-sm" onclick="calSaveStatut()">Enregistrer</button>
      <button class="btn btn-danger btn-sm" onclick="calDeleteRdv()">Supprimer</button>
      <button class="btn btn-sm" onclick="calCloseModal()">Fermer</button>
    </div>
  </div>
</div>
```

**CSS à ajouter** (dans le `<style>` existant) :
```css
/* Calendrier */
.cal-toggle { display:flex; gap:8px; margin-bottom:15px; }
.cal-toggle-btn { padding:6px 14px; border:1px solid #ddd; border-radius:4px; background:#fff; cursor:pointer; font-size:12px; }
.cal-toggle-btn.active { background:#1e3c72; color:#fff; border-color:#1e3c72; }

.cal-nav { display:flex; align-items:center; justify-content:center; gap:15px; margin-bottom:15px; }
.cal-nav span { font-weight:bold; color:#1e3c72; font-size:14px; }

.cal-grid { display:grid; grid-template-columns:repeat(7,1fr); gap:1px; background:#eee; border:1px solid #eee; }
.cal-header-cell { background:#1e3c72; color:#fff; text-align:center; padding:6px; font-size:11px; font-weight:bold; }
.cal-day { background:#fff; min-height:80px; padding:4px; cursor:pointer; position:relative; }
.cal-day:hover { background:#f8f9fa; }
.cal-day.today { background:#e3f2fd; }
.cal-day.other-month { background:#fafafa; color:#ccc; }
.cal-day-num { font-size:11px; font-weight:bold; color:#333; }
.cal-dots { display:flex; flex-wrap:wrap; gap:3px; margin-top:4px; }
.cal-dot { width:8px; height:8px; border-radius:50%; }
.cal-dot.Prevu { background:#2196f3; }
.cal-dot.Realise { background:#4caf50; }
.cal-dot.Offre { background:#ff9800; }
.cal-dot.BC\ Signe { background:#9c27b0; }
.cal-day-count { position:absolute; top:4px; right:4px; background:#1e3c72; color:#fff; border-radius:50%; width:18px; height:18px; font-size:10px; display:flex; align-items:center; justify-content:center; }

/* Timeline */
.cal-timeline-item { display:flex; gap:12px; padding:12px; border-left:3px solid #2196f3; margin-bottom:8px; background:#f8f9fa; border-radius:0 4px 4px 0; cursor:pointer; }
.cal-timeline-item:hover { background:#e3f2fd; }
.cal-timeline-item.Realise { border-left-color:#4caf50; }
.cal-timeline-item.Offre { border-left-color:#ff9800; }
.cal-timeline-item.BC\ Signe { border-left-color:#9c27b0; }
.cal-timeline-date { font-size:12px; color:#666; min-width:80px; }
.cal-timeline-info { flex:1; }
.cal-timeline-prospect { font-weight:bold; color:#1e3c72; font-size:13px; }
.cal-timeline-montant { font-size:12px; color:#666; }
.cal-timeline-statut { font-size:11px; padding:2px 6px; border-radius:3px; font-weight:bold; }
.cal-timeline-statut.Prevu { background:#e3f2fd; color:#1565c0; }
.cal-timeline-statut.Realise { background:#e8f5e9; color:#2e7d32; }
.cal-timeline-statut.Offre { background:#fff3e0; color:#e65100; }
.cal-timeline-statut.BC\ Signe { background:#f3e5f5; color:#7b1fa2; }

/* Modal */
.cal-modal-overlay { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; align-items:center; justify-content:center; }
.cal-modal { background:#fff; border-radius:8px; width:100%; max-width:420px; box-shadow:0 10px 40px rgba(0,0,0,0.3); }
.cal-modal-header { display:flex; justify-content:space-between; align-items:center; padding:15px 20px; border-bottom:1px solid #eee; }
.cal-modal-header h3 { color:#1e3c72; font-size:16px; margin:0; }
.cal-modal-close { background:none; border:none; font-size:18px; cursor:pointer; color:#999; }
.cal-modal-body { padding:20px; }
.cal-modal-field { margin-bottom:12px; }
.cal-modal-field label { display:block; font-size:11px; font-weight:bold; color:#666; text-transform:uppercase; margin-bottom:4px; }
.cal-modal-field span { font-size:14px; color:#333; }
.cal-statut-select { width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:13px; }
.cal-modal-actions { display:flex; gap:8px; padding:15px 20px; border-top:1px solid #eee; justify-content:flex-end; }

.cal-empty { text-align:center; padding:30px; color:#999; font-size:13px; }
```

**JavaScript à ajouter** (dans le `<script>` existant) :
```javascript
// --- Calendrier ---
let calDate = new Date();
let calView = 'month';
let calRdvs = [];
let calSelectedRdv = null;

async function calLoadRdvs() {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  const from = `${year}-${String(month+1).padStart(2,'0')}-01`;
  const to = `${year}-${String(month+1).padStart(2,'0')}-${new Date(year, month+1, 0).getDate()}`;
  try {
    const res = await api('GET', `/api/collectes/rdvs?from=${from}&to=${to}`);
    calRdvs = res;
  } catch(e) { calRdvs = []; }
  calRender();
}

function calRender() {
  if (calView === 'month') calRenderMonth();
  else calRenderTimeline();
  document.getElementById('cal-month-label').textContent =
    calDate.toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
}

function calRenderMonth() {
  // Grille 7 colonnes (Lun-Dim), 5-6 lignes
  // Remplir avec les jours du mois + jours des mois adjacents
  // Placer les dots par date
}

function calRenderTimeline() {
  // Liste chronologique des RDV du mois, triés par date
  // Afficher prospect, date, montant, statut
}

function calPrevMonth() { calDate.setMonth(calDate.getMonth()-1); calLoadRdvs(); }
function calNextMonth() { calDate.setMonth(calDate.getMonth()+1); calLoadRdvs(); }
function calToggleView(view) { calView = view; calRender(); }

function calOpenModal(rdv) {
  calSelectedRdv = rdv;
  document.getElementById('cal-modal-prospect').textContent = rdv.prospect;
  document.getElementById('cal-modal-date').textContent = rdv.date;
  document.getElementById('cal-modal-montant').textContent = rdv.montant + ' M FCFA';
  document.getElementById('cal-modal-statut').value = rdv.statut;
  document.getElementById('cal-modal').style.display = 'flex';
}

function calCloseModal() {
  document.getElementById('cal-modal').style.display = 'none';
  calSelectedRdv = null;
}

async function calSaveStatut() {
  if (!calSelectedRdv) return;
  const newStatut = document.getElementById('cal-modal-statut').value;
  try {
    await api('PATCH', `/api/collectes/rdvs/${calSelectedRdv.id}`, { statut: newStatut });
    calCloseModal();
    calLoadRdvs();
  } catch(e) { alert('Erreur: ' + e.message); }
}

async function calDeleteRdv() {
  if (!calSelectedRdv) return;
  if (!confirm('Supprimer ce RDV ?')) return;
  try {
    await api('DELETE', `/api/collectes/rdvs/${calSelectedRdv.id}`);
    calCloseModal();
    calLoadRdvs();
  } catch(e) { alert('Erreur: ' + e.message); }
}
```

## API Endpoints

### `GET /api/collectes/rdvs`

**Auth** : Utilisateur connecté (any role)
**Query params** :
- `from` (optionnel) : date début YYYY-MM-DD
- `to` (optionnel) : date fin YYYY-MM-DD

**Response** :
```json
[
  {
    "id": 1,
    "prospect": "Client ABC",
    "date": "2026-08-25",
    "montant": 5.0,
    "statut": "Prevu",
    "collecte_id": 12,
    "collecte_statut": "brouillon"
  }
]
```

**SQL** :
```sql
SELECT r.id, r.prospect, r.date, r.montant, r.statut, r.collecte_id, c.statut as collecte_statut
FROM rdvs r
JOIN collectes c ON c.id = r.collecte_id
WHERE c.user_id = ?
  AND (? IS NULL OR r.date >= ?)
  AND (? IS NULL OR r.date <= ?)
ORDER BY r.date ASC
```

### `PATCH /api/collectes/rdvs/:id`

**Auth** : Propriétaire de la collecte parente
**Body** : `{ statut: "Prevu" | "Realise" | "Offre" | "BC Signe" }`
**Contrainte** : La collecte parente doit être en statut `brouillon`

### `DELETE /api/collectes/rdvs/:id`

**Auth** : Propriétaire de la collecte parente
**Contrainte** : La collecte parente doit être en statut `brouillon`

## Étapes d'implémentation

1. **Backend** : Ajouter les 3 endpoints dans `routes/collectes.js`
2. **Frontend** : Ajouter le HTML du calendrier dans `dashboard.html` (après les graphiques)
3. **Frontend** : Ajouter le CSS du calendrier dans le `<style>` existant
4. **Frontend** : Ajouter le JavaScript du calendrier dans le `<script>` existant
5. **Test** : Vérifier que les RDV s'affichent dans le calendrier, que la modification/suppression fonctionne
6. **Commit** : Valider et pousser

## Contraintes techniques

- Pas de dépendances externes (pas de bibliothèque calendaire, tout en vanilla JS/HTML/CSS)
- Style cohérent avec le dashboard existant (bleu #1e3c72, Segoe UI, cards blanches avec ombre)
- Les RDVs de collectes validées/approuvées sont en lecture seule (pas de modify/delete)
- Responsive : la grille du mois s'adapte aux écrans mobiles

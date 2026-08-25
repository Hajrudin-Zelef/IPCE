window.__load_docs = function() {
  const el = document.getElementById('section-docs-content');
  el.innerHTML = `
    <div class="docs-content">
      <div class="docs-section">
        <h3>📊 Navigation du Dashboard</h3>
        <p>Le sidebar permet d'accéder à toutes les sections du tableau de bord. Cliquez sur un élément du menu pour naviguer.</p>
        <ul>
          <li><strong>Vue d'ensemble</strong> — KPI, leaderboard, graphiques et validations</li>
          <li><strong>Commercial</strong> — Graphiques, suivi individuel et performance</li>
          <li><strong>Rapports</strong> — Analyse exécutive et rapports personnalisés</li>
          <li><strong>RDV</strong> — Calendrier, prospects et rappels</li>
          <li><strong>Validation</strong> — Demandes en attente et historique</li>
          <li><strong>Insights</strong> — Tendances et prévisions IA</li>
        </ul>
      </div>
      <div class="docs-section">
        <h3>📈 Comprendre les KPI</h3>
        <p>Les indicateurs clés sont calculés à partir des collectes approuvées :</p>
        <ul>
          <li><strong>CA Équipe</strong> — Chiffre d'affaires total validé</li>
          <li><strong>Offres</strong> — Nombre d'offres émises</li>
          <li><strong>BC Signés</strong> — Bons de commande signés</li>
          <li><strong>RDV</strong> — Nombre total de rendez-vous</li>
        </ul>
        <p>Les seuils : <span class="docs-kbd">OK</span> ≥ objectif, <span class="docs-kbd">Suivi</span> ≥ 70%, <span class="docs-kbd">Alerte</span> &lt; 70%</p>
      </div>
      <div class="docs-section">
        <h3>✅ Workflow de Validation</h3>
        <p>Les collectes suivent ce processus :</p>
        <ul>
          <li><strong>Brouillon</strong> → Le commercial soumet sa collecte</li>
          <li><strong>Validée</strong> → En attente d'approbation admin</li>
          <li><strong>Approuvée</strong> → Comptabilisée dans les KPI</li>
          <li><strong>Rejetée</strong> → Retournée au commercial</li>
        </ul>
      </div>
      <div class="docs-section">
        <h3>📥 Export</h3>
        <p>Le bouton Exporter (en haut à droite) permet de télécharger :</p>
        <ul>
          <li><strong>Excel</strong> — Rapport complet multi-feuilles</li>
          <li><strong>CSV</strong> — Données brutes</li>
          <li><strong>PNG</strong> — Capture du dashboard</li>
          <li><strong>PDF</strong> — Document imprimable</li>
        </ul>
      </div>
      <div class="docs-section">
        <h3>⌨️ Raccourcis Clavier</h3>
        <ul>
          <li><span class="docs-kbd">Ctrl+B</span> — Réduire/étendre le sidebar</li>
          <li><span class="docs-kbd">Escape</span> — Fermer le panneau mobile</li>
        </ul>
      </div>
    </div>
  `;
};

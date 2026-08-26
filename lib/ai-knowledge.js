// ========================================
// BASE DE CONNAISSANCE IPCE — Dashboard Pilotage Commercial
// Fichier interne pour l'IA — Ne pas exposer
// ========================================

const KNOWLEDGE = {
  app: {
    name: 'IPCE Dashboard',
    version: '2.1.0',
    purpose: 'Pilotage commercial pour une équipe de commerciaux. Suivi des performances, validation des collectes, gestion des RDV, analyse business.',
    tagline: 'Dashboard de pilotage commercial temps réel',
  },

  features: {
    dashboard: {
      name: 'Vue d\'ensemble',
      description: 'KPI principaux (CA, Offres, BC), leaderboard des commerciaux, center de validation rapide',
      metrics: ['CA total vs objectif', 'Offres émises', 'BC signés', 'Taux de conversion RDV→Offre', 'Taux de fermeture Offre→BC'],
    },
    graphiques: {
      name: 'Graphiques',
      description: 'Visualisations Chart.js : barres CA par commercial, donut répartition, pipeline RDV→Offre→BC, top commercaux',
      charts: ['CA par commercial (barres)', 'Répartition CA (donut)', 'Pipeline commercial (funnel)', 'Top commercaux (barres)'],
    },
    suiviCommercial: {
      name: 'Suivi par Commercial',
      description: 'Fiche détaillée par commercial avec ses KPIs, historique, tendances',
    },
    performance: {
      name: 'Performance',
      description: 'Analyse de performance comparative entre commerciaux avec classement',
    },
    executive: {
      name: 'Analyse Executive',
      description: 'Vue战略 pour la direction avec synthèse des KPIs et recommandations',
    },
    calendrier: {
      name: 'Calendrier RDV',
      description: 'Vue mois (grille 7 colonnes) et timeline chronologique des RDV. CRUD avec modification statut. Filtres par date.',
      statuts: ['Prévu', 'Réalisé', 'Offre', 'BC Signé'],
      contrainte: 'Modification/suppression RDV uniquement si collecte en brouillon',
    },
    prospects: {
      name: 'Suivi Prospects',
      description: 'Pipeline de prospects avec KPI bar, cards avatares, badges statut, vue grille/liste, recherche temps réel, filtres par statut',
    },
    rappels: {
      name: 'Rappels',
      description: 'Système de rappels admin avec priorité (high/medium/low), dates, regroupement par statut, modal création/modification',
    },
    validation: {
      name: 'Demandes en Attente',
      description: 'Validation des collectes soumises par les commerciaux. Actions Approuver/Rejeter avec confirmation. Historique compact.',
      workflow: 'brouillon → validée (commercial) → approuvée/rejetée (admin)',
    },
    insights: {
      name: 'Business Insights',
      description: 'Score de santé 0-100 (SVG jauge), barres progression, cartes Opportunités/Points d\'attention/Prévisions, actions recommandées',
      formule_health: '(pctCA*0.35) + (pctOffres*0.2) + (pctBC*0.25) + (pctRDV*0.2)',
    },
    documentation: {
      name: 'Documentation',
      description: '7 docs techniques (4891 lignes) lues avec marked.js + highlight.js. Sidebar navigation, code colorisé.',
      docs: ['Architecture', 'API', 'Auth', 'Installation', 'Déploiement', 'Troubleshooting', 'FAQ'],
    },
    users: {
      name: 'Gestion Utilisateurs',
      description: 'CRUD users, reset mot de passe, protection dernier admin, avatars initiales, recherche temps réel',
    },
    logs: {
      name: 'Logs Système',
      description: 'Audit trail complet (10 types d\'actions), timeline groupée par jour, filtres, auto-refresh 30s',
    },
    settings: {
      name: 'Paramètres',
      description: '6 sections: Objectifs, Apparence (dark mode), Notifications, Sécurité (2FA), Système, Données (export/reset)',
    },
    darkMode: {
      name: 'Dark Mode',
      description: 'Thème sombre complet via CSS variables. Toggle immédiat. 50+ sélecteurs. Persisté BDD + localStorage.',
      colors: { bg: '#0B1120', card: '#111827', text: '#F1F5F9', primary: '#3B82F6', border: '#1E293B' },
    },
    exports: {
      name: 'Exports',
      description: 'PDF (html2canvas+jsPDF), JPEG, CSV (delimiter ;), XLSX (ExcelJS). Rapports éditoriaux avec logo IPCE.',
      formats: ['PDF', 'JPEG', 'CSV', 'XLSX'],
    },
    notifications: {
      name: 'Notifications',
      description: 'Système temps réel via WebSocket. 6 types: collecte_pending, collecte_approved, collecte_rejected, reminder, system, info. Filtrage, son, badges.',
    },
    ai: {
      name: 'Assistant IA',
      description: 'Chat IA flottant multi-provider (Groq/OpenRouter/DeepSeek). 3 modes gratuit/standard/elite. God Mode pour accès technique. Analyse auto toutes les 6h.',
    },
  },

  architecture: {
    stack: 'Node.js + Express 4 + SQLite (better-sqlite3) + Vanilla JS/CSS',
    auth: 'JWT httpOnly cookies (8h expiry), bcrypt 12 rounds, rate limiting 10/15min/IP',
    realtime: 'WebSocket (ws) pour notifications + insights IA',
    database: 'SQLite WAL mode, 9 tables, FK constraints, indexes',
    deployment: 'VPS avec systemd service (ipce.service), port 4600',
    security: 'HSTS, X-Frame-Options DENY, CSP, X-Content-Type-Options nosniff, Referrer-Policy',
  },

  workflow: {
    collecte: {
      steps: ['Commercial crée brouillon', 'Commercial valide → envoie à admin', 'Admin approuve ou rejette'],
      statuts: ['brouillon', 'validee', 'approuvee', 'rejetee'],
      rules: [
        'Seul le propriétaire peut modifier un brouillon',
        'La validation envoie une notification à l\'admin',
        'L\'approbation/rejet génère un log',
        'Les RDVs sont liés à la collecte et supprimés en cascade',
      ],
    },
    rdv: {
      statuts: ['Prévu', 'Réalisé', 'Offre', 'BC Signé'],
      progression: 'Prévu → Réalisé → Offre → BC Signé',
      modification: 'Uniquement si la collecte parent est en brouillon',
    },
  },

  businessLogic: {
    ca: 'Chiffre d\'affaires en FCFA. Objectif mensuel configurable (défaut: 100M FCFA)',
    offres: 'Nombre d\'offres émises. Objectif configurable (défaut: 6/mois)',
    bc: 'Bonnes Commandes signées. Objectif configurable (défaut: 6/mois)',
    rdv: 'Rendez-vous commerciaux. Objectif configurable (défaut: 6/mois)',
    conversion_rdv_offre: 'Offres / RDV total × 100',
    conversion_offre_bc: 'BC / Offres × 100',
    projection_ca: '(CA / jour_du_mois) × jours_dans_le_mois',
    health_score: '(pctCA×0.35) + (pctOffres×0.2) + (pctBC×0.25) + (pctRDV×0.2)',
  },

  // Réponses types pour questions fréquentes
  faq: {
    'comment changer le theme': 'Paramètres → Apparence → Toggle Dark Mode. Le thème est sauvegardé automatiquement.',
    'comment exporter': 'Bouton "Exporter" en haut à droite du dashboard. Choisissez PDF, Excel, CSV ou PNG.',
    'comment ajouter un rdv': 'Dashboard Commercial → Saisir ma collecte → Section RDV → Ajouter RDV.',
    'comment valider une collecte': 'Admin → Validation Center → Cliquer "Approuver" ou "Rejeter" sur la collecte.',
    'comment activer la 2fa': 'Paramètres → Sécurité → Configurer la 2FA → Scanner le QR code avec Google Authenticator.',
    'comment changer le mot de passe': 'Menu utilisateur (bas de sidebar) → Changer le mot de passe.',
    'combien de commerciaux': 'L\'équipe compte actuellement les commerciaux enregistrés dans le système.',
    'quel est le score de sante': 'Le score de santé commercial est calculé sur 4 KPIs pondérés: CA (35%), Offres (20%), BC (25%), RDV (20%).',
  },

  troubleshooting: {
    'page ne charge pas': 'Vérifiez que le serveur tourne sur le port 4600. Redémarrez avec: sudo systemctl restart ipce',
    'exports ne marchent pas': 'Les exports PDF nécessitent html2canvas. Vérifiez la connexion CDN.',
    'notifications ne arrivent pas': 'Vérifiez la connexion WebSocket (port 4600, path /ws). Le fallback polling est activé toutes les 15s.',
    'dark mode ne s\'applique pas': 'Videz le localStorage et rechargé la page. Le thème est dans [data-theme="dark"] sur <html>.',
    '2fa ne fonctionne pas': 'Vérifiez l\'horloge de votre appareil. Le TOTP a une fenêtre de ±30 secondes.',
  },
};

module.exports = KNOWLEDGE;

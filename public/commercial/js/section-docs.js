/* ========================================
   SECTION — Documentation (Guide Complet)
   Sidebar + Modules structurés
   ======================================== */

window.__load_docs = function() {
  var el = document.getElementById('section-docs-content');
  if (!el) return;

  var html = '<div class="docs-layout">';

  // --- SIDEBAR DOCUMENTATION ---
  html += '<aside class="docs-sidebar">';
  html += '<div class="docs-sidebar-header">&#128214; Guide IPCE</div>';
  html += '<nav class="docs-sidebar-nav">';

  // Module 1: Bien démarrer
  html += '<div class="docs-nav-group" data-group="bien">';
  html += '<div class="docs-nav-group-toggle" onclick="docsToggleGroup(this)">&#128075; Bien démarrer <span class="docs-arrow">&#9654;</span></div>';
  html += '<div class="docs-nav-group-items">';
  html += '<a class="docs-nav-item active" data-docs="intro" onclick="docsNavigate(\'intro\',this)">Bienvenue</a>';
  html += '<a class="docs-nav-item" data-docs="role" onclick="docsNavigate(\'role\',this)">Mon rôle</a>';
  html += '<a class="docs-nav-item" data-docs="interface" onclick="docsNavigate(\'interface\',this)">L\'interface</a>';
  html += '</div></div>';

  // Module 2: Collectes
  html += '<div class="docs-nav-group" data-group="collectes">';
  html += '<div class="docs-nav-group-toggle" onclick="docsToggleGroup(this)">&#9998;&#65039; Collectes <span class="docs-arrow">&#9654;</span></div>';
  html += '<div class="docs-nav-group-items">';
  html += '<a class="docs-nav-item" data-docs="saisie" onclick="docsNavigate(\'saisie\',this)">Saisir une collecte</a>';
  html += '<a class="docs-nav-item sub" data-docs="saisie-champs" onclick="docsNavigate(\'saisie-champs\',this)">Les champs</a>';
  html += '<a class="docs-nav-item sub" data-docs="saisie-rdv" onclick="docsNavigate(\'saisie-rdv\',this)">Ajouter des RDV</a>';
  html += '<a class="docs-nav-item sub" data-docs="saisie-actions" onclick="docsNavigate(\'saisie-actions\',this)">Sauvegarder / Valider</a>';
  html += '<a class="docs-nav-item" data-docs="historique" onclick="docsNavigate(\'historique\',this)">Historique</a>';
  html += '<a class="docs-nav-item sub" data-docs="hist-actions" onclick="docsNavigate(\'hist-actions\',this)">Actions</a>';
  html += '<a class="docs-nav-item sub" data-docs="hist-modifier" onclick="docsNavigate(\'hist-modifier\',this)">Modifier</a>';
  html += '<a class="docs-nav-item sub" data-docs="hist-supprimer" onclick="docsNavigate(\'hist-supprimer\',this)">Supprimer</a>';
  html += '</div></div>';

  // Module 3: Rendez-vous
  html += '<div class="docs-nav-group" data-group="rdv">';
  html += '<div class="docs-nav-group-toggle" onclick="docsToggleGroup(this)">&#128197; Rendez-vous <span class="docs-arrow">&#9654;</span></div>';
  html += '<div class="docs-nav-group-items">';
  html += '<a class="docs-nav-item" data-docs="rdv-statuts" onclick="docsNavigate(\'rdv-statuts\',this)">Statuts des RDV</a>';
  html += '<a class="docs-nav-item" data-docs="rdv-modifier" onclick="docsNavigate(\'rdv-modifier\',this)">Modifier un RDV</a>';
  html += '<a class="docs-nav-item" data-docs="rdv-supprimer" onclick="docsNavigate(\'rdv-supprimer\',this)">Supprimer un RDV</a>';
  html += '</div></div>';

  // Module 4: Visualisation
  html += '<div class="docs-nav-group" data-group="viz">';
  html += '<div class="docs-nav-group-toggle" onclick="docsToggleGroup(this)">&#128202; Visualisation <span class="docs-arrow">&#9654;</span></div>';
  html += '<div class="docs-nav-group-items">';
  html += '<a class="docs-nav-item" data-docs="dashboard" onclick="docsNavigate(\'dashboard\',this)">Tableau de bord</a>';
  html += '<a class="docs-nav-item sub" data-docs="dash-kpis" onclick="docsNavigate(\'dash-kpis\',this)">KPIs</a>';
  html += '<a class="docs-nav-item sub" data-docs="dash-graphs" onclick="docsNavigate(\'dash-graphs\',this)">Graphiques</a>';
  html += '<a class="docs-nav-item" data-docs="calendrier" onclick="docsNavigate(\'calendrier\',this)">Calendrier</a>';
  html += '<a class="docs-nav-item sub" data-docs="cal-navigation" onclick="docsNavigate(\'cal-navigation\',this)">Navigation</a>';
  html += '<a class="docs-nav-item sub" data-docs="cal-couleurs" onclick="docsNavigate(\'cal-couleurs\',this)">Codes couleur</a>';
  html += '<a class="docs-nav-item sub" data-docs="cal-interactions" onclick="docsNavigate(\'cal-interactions\',this)">Interactions</a>';
  html += '</div></div>';

  // Module 5: Outils
  html += '<div class="docs-nav-group" data-group="outils">';
  html += '<div class="docs-nav-group-toggle" onclick="docsToggleGroup(this)">&#128295; Outils <span class="docs-arrow">&#9654;</span></div>';
  html += '<div class="docs-nav-group-items">';
  html += '<a class="docs-nav-item" data-docs="notifications" onclick="docsNavigate(\'notifications\',this)">Notifications</a>';
  html += '<a class="docs-nav-item" data-docs="darkmode" onclick="docsNavigate(\'darkmode\',this)">Mode sombre</a>';
  html += '<a class="docs-nav-item" data-docs="raccourcis" onclick="docsNavigate(\'raccourcis\',this)">Raccourcis</a>';
  html += '<a class="docs-nav-item" data-docs="mobile" onclick="docsNavigate(\'mobile\',this)">Version mobile</a>';
  html += '</div></div>';

  // Module 6: Aide
  html += '<div class="docs-nav-group" data-group="aide">';
  html += '<div class="docs-nav-group-toggle" onclick="docsToggleGroup(this)">&#10067; Aide <span class="docs-arrow">&#9654;</span></div>';
  html += '<div class="docs-nav-group-items">';
  html += '<a class="docs-nav-item" data-docs="statuts" onclick="docsNavigate(\'statuts\',this)">Signification des statuts</a>';
  html += '<a class="docs-nav-item" data-docs="faq" onclick="docsNavigate(\'faq\',this)">FAQ</a>';
  html += '</div></div>';

  html += '</nav></aside>';

  // --- CONTENU ---
  html += '<div class="docs-content">';

  // ===== BIEN DÉMARRER =====
  // Introduction
  html += '<div class="docs-section active" id="docs-intro">';
  html += '<div class="docs-breadcrumb">Bien démarrer &rsaquo; Bienvenue</div>';
  html += '<h2 class="docs-title">&#128075; Bienvenue dans IPCE Dashboard</h2>';
  html += '<p class="docs-text"><strong>IPCE Dashboard</strong> est votre outil de pilotage commercial. Il vous permet de suivre vos performances, gérer vos collectes, planifier vos rendez-vous et visualiser votre activité en temps réel.</p>';
  html += '<div class="docs-callout docs-callout-info">';
  html += '<strong>&#128161; Premier pas ?</strong> Commencez par la section <strong>"Saisir une collecte"</strong> pour enregistrer votre première journée de travail.';
  html += '</div>';
  html += '<div class="docs-grid docs-grid-3">';
  html += '<div class="docs-feature"><div class="docs-feature-icon">&#128202;</div><div class="docs-feature-title">Tableau de bord</div><div class="docs-feature-desc">Vue d\'ensemble de vos performances</div></div>';
  html += '<div class="docs-feature"><div class="docs-feature-icon">&#9998;&#65039;</div><div class="docs-feature-title">Collectes</div><div class="docs-feature-desc">Saisir et gérer vos résultats</div></div>';
  html += '<div class="docs-feature"><div class="docs-feature-icon">&#128197;</div><div class="docs-feature-title">Calendrier</div><div class="docs-feature-desc">Planifier vos rendez-vous</div></div>';
  html += '</div>';
  html += '</div>';

  // Mon rôle
  html += '<div class="docs-section" id="docs-role" style="display:none;">';
  html += '<div class="docs-breadcrumb">Bien démarrer &rsaquo; Mon rôle</div>';
  html += '<h2 class="docs-title">&#128188; Mon rôle en tant que commercial</h2>';
  html += '<p class="docs-text">En tant que commercial IPCE, vous êtes le pilier de l\'activité commerciale. Votre mission : développer le portefeuille clients et atteindre vos objectifs.</p>';
  html += '<h3 class="docs-subtitle">Vos responsabilités quotidiennes</h3>';
  html += '<div class="docs-checklist">';
  html += '<div class="docs-check-item">&#9989; Saisir vos collectes quotidiennes (CA, offres, BC)</div>';
  html += '<div class="docs-check-item">&#9989; Planifier et suivre vos rendez-vous prospects</div>';
  html += '<div class="docs-check-item">&#9989; Mettre à jour le statut de vos RDV (Prévu → Réalisé → Offre → BC Signé)</div>';
  html += '<div class="docs-check-item">&#9989; Consulter vos performances via le tableau de bord</div>';
  html += '<div class="docs-check-item">&#9989; Valider vos collectes pour notification à l\'admin</div>';
  html += '</div>';
  html += '<h3 class="docs-subtitle">Ce que vous ne pouvez PAS faire</h3>';
  html += '<ul class="docs-list">';
  html += '<li>Modifier ou supprimer une collecte déjà validée/approuvée</li>';
  html += '<li>Accéder aux données des autres commerciaux</li>';
  html += '<li>Modifier les paramètres système (objectifs, etc.)</li>';
  html += '<li>Approuver ou rejeter des collectes (réservé à l\'admin)</li>';
  html += '</ul>';
  html += '</div>';

  // L'interface
  html += '<div class="docs-section" id="docs-interface" style="display:none;">';
  html += '<div class="docs-breadcrumb">Bien démarrer &rsaquo; L\'interface</div>';
  html += '<h2 class="docs-title">&#128187; Comprendre l\'interface</h2>';
  html += '<p class="docs-text">L\'interface est organisée en <strong>sidebar</strong> (menu latéral) et <strong>sections</strong> de contenu.</p>';
  html += '<div class="docs-anatomy">';
  html += '<div class="docs-anatomy-item"><div class="docs-anatomy-label">Sidebar</div><div class="docs-anatomy-desc">Menu latéral avec les sections. Cliquez pour naviguer.</div></div>';
  html += '<div class="docs-anatomy-item"><div class="docs-anatomy-label">Header</div><div class="docs-anatomy-desc">En haut : bouton menu, date, dark mode, avatar.</div></div>';
  html += '<div class="docs-anatomy-item"><div class="docs-anatomy-label">Avatar</div><div class="docs-anatomy-desc">Votre initiale. Cliquez pour le menu (Profil, Apparence, Déconnexion).</div></div>';
  html += '<div class="docs-anatomy-item"><div class="docs-anatomy-label">Cloche</div><div class="docs-anatomy-desc">Notifications en temps réel. Cliquez pour voir les alertes.</div></div>';
  html += '</div>';
  html += '<div class="docs-callout docs-callout-tip">';
  html += '<strong>&#128161;</strong> Sur mobile, la sidebar se cache. Utilisez le bouton &#9776; pour l\'ouvrir.';
  html += '</div>';
  html += '</div>';

  // ===== COLLECTES =====
  // Saisir une collecte
  html += '<div class="docs-section" id="docs-saisie" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Saisir une collecte</div>';
  html += '<h2 class="docs-title">&#9998;&#65039; Saisir une collecte</h2>';
  html += '<p class="docs-text">C\'est la fonction principale. Pour chaque journée de travail, vous saisissez vos résultats commerciaux.</p>';
  html += '<div class="docs-steps">';
  html += '<div class="docs-step"><div class="docs-step-num">1</div><div class="docs-step-content"><strong>Remplissez les champs</strong> : CA, Offres émises, BC signés</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">2</div><div class="docs-step-content"><strong>Ajoutez vos RDV</strong> (optionnel) : prospect, date, montant, statut</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">3</div><div class="docs-step-content"><strong>Choisissez l\'action</strong> : Sauvegarder (brouillon) ou Valider (envoyer à l\'admin)</div></div>';
  html += '</div>';
  html += '<div class="docs-callout docs-callout-warning">';
  html += '<strong>&#9888;&#65039; Attention</strong> : La date des RDV est pré-remplie avec aujourd\'hui. Modifiez-la si le RDV est programmé pour un autre jour.';
  html += '</div>';
  html += '</div>';

  // Les champs
  html += '<div class="docs-section" id="docs-saisie-champs" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Saisir une collecte &rsaquo; Les champs</div>';
  html += '<h2 class="docs-title">&#128221; Les champs de saisie</h2>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Champ</th><th>Type</th><th>Description</th><th>Exemple</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><strong>CA (FCFA)</strong></td><td>Nombre</td><td>Chiffre d\'affaires réalisé dans la journée</td><td>2 500 000</td></tr>';
  html += '<tr><td><strong>Offres émises</strong></td><td>Nombre entier</td><td>Nombre d\'offres envoyées aux prospects</td><td>5</td></tr>';
  html += '<tr><td><strong>BC signés</strong></td><td>Nombre entier</td><td>Bons de commande signés par les clients</td><td>2</td></tr>';
  html += '</tbody></table></div>';
  html += '<div class="docs-callout docs-callout-info">';
  html += '<strong>&#128161;</strong> Tous les champs sont optionnels, mais au moins un doit être rempli pour sauvegarder.';
  html += '</div>';
  html += '</div>';

  // Ajouter des RDV
  html += '<div class="docs-section" id="docs-saisie-rdv" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Saisir une collecte &rsaquo; Ajouter des RDV</div>';
  html += '<h2 class="docs-title">&#128197; Ajouter des RDV à votre collecte</h2>';
  html += '<p class="docs-text">Chaque rendez-vous peut être associé à une collecte. Voici comment les ajouter :</p>';
  html += '<div class="docs-steps">';
  html += '<div class="docs-step"><div class="docs-step-num">1</div><div class="docs-step-content">Entrez le <strong>nom du prospect</strong> (obligatoire)</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">2</div><div class="docs-step-content">Vérifiez la <strong>date</strong> (pré-remplie avec aujourd\'hui)</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">3</div><div class="docs-step-content">Ajoutez le <strong>montant</strong> en millions FCFA (optionnel)</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">4</div><div class="docs-step-content">Choisissez le <strong>statut</strong> initial (généralement "Prévu")</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">5</div><div class="docs-step-content">Cliquez sur <strong>+</strong> pour ajouter à la liste</div></div>';
  html += '</div>';
  html += '<div class="docs-callout docs-callout-danger">';
  html += '<strong>&#128308; Erreur courante</strong> : Si le bouton "+" ne réagit pas, vérifiez que le prospect ET la date sont remplis.';
  html += '</div>';
  html += '</div>';

  // Sauvegarder / Valider
  html += '<div class="docs-section" id="docs-saisie-actions" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Saisir une collecte &rsaquo; Sauvegarder / Valider</div>';
  html += '<h2 class="docs-title">&#128190; Sauvegarder vs Valider</h2>';
  html += '<div class="docs-grid docs-grid-2">';
  html += '<div class="docs-compare">';
  html += '<div class="docs-compare-header docs-compare-save">&#128190; Sauvegarder</div>';
  html += '<ul class="docs-list">';
  html += '<li>Enregistre en <strong>brouillon</strong></li>';
  html += '<li><strong>Modifiable</strong> et supprimable</li>';
  html += '<li>Pas de notification à l\'admin</li>';
  html += '<li>Idéal si vous n\'êtes pas sûr des données</li>';
  html += '</ul></div>';
  html += '<div class="docs-compare">';
  html += '<div class="docs-compare-header docs-compare-validate">&#10003; Valider et envoyer</div>';
  html += '<ul class="docs-list">';
  html += '<li>Enregistre et <strong>valide</strong> la collecte</li>';
  html += '<li><strong>Non modifiable</strong> ensuite</li>';
  html += '<li>Notification envoyée à l\'admin</li>';
  html += '<li>L\'admin l\'approuvera ou la rejettera</li>';
  html += '</ul></div>';
  html += '</div>';
  html += '<div class="docs-callout docs-callout-danger">';
  html += '<strong>&#128308; Irréversible</strong> : Une collecte validée ne peut plus être ni modifiée ni supprimée. Vérifiez bien avant de valider.';
  html += '</div>';
  html += '</div>';

  // Historique
  html += '<div class="docs-section" id="docs-historique" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Historique</div>';
  html += '<h2 class="docs-title">&#128203; Historique de vos collectes</h2>';
  html += '<p class="docs-text">Retrouvez toutes vos collectes passées dans un tableau chronologique.</p>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Colonne</th><th>Description</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><strong>Date</strong></td><td>Date de création de la collecte</td></tr>';
  html += '<tr><td><strong>CA</strong></td><td>Chiffre d\'affaires en millions FCFA</td></tr>';
  html += '<tr><td><strong>Offres</strong></td><td>Nombre d\'offres émises</td></tr>';
  html += '<tr><td><strong>BC</strong></td><td>Nombre de bons de commande signés</td></tr>';
  html += '<tr><td><strong>RDV</strong></td><td>Nombre de rendez-vous associés</td></tr>';
  html += '<tr><td><strong>Statut</strong></td><td>Brouillon, Validée, Approuvée, Rejetée</td></tr>';
  html += '<tr><td><strong>Actions</strong></td><td>Boutons disponibles (brouillons uniquement)</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // Actions sur collectes
  html += '<div class="docs-section" id="docs-hist-actions" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Historique &rsaquo; Actions</div>';
  html += '<h2 class="docs-title">&#128195; Actions sur les collectes</h2>';
  html += '<p class="docs-text">Seules les collectes en <strong>brouillon</strong> disposent d\'actions.</p>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Bouton</th><th>Action</th><th>Conditions</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td class="docs-center">&#128065;</td><td><strong>Voir</strong> — Affiche les détails complets</td><td>Tous les statuts</td></tr>';
  html += '<tr><td class="docs-center">&#9998;</td><td><strong>Modifier</strong> — Ouvre le formulaire d\'édition</td><td>Brouillon uniquement</td></tr>';
  html += '<tr><td class="docs-center">&#10005;</td><td><strong>Supprimer</strong> — Supprime définitivement</td><td>Brouillon uniquement</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // Modifier
  html += '<div class="docs-section" id="docs-hist-modifier" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Historique &rsaquo; Modifier</div>';
  html += '<h2 class="docs-title">&#9998; Modifier une collecte</h2>';
  html += '<p class="docs-text">Seules les collectes en brouillon sont modifiables.</p>';
  html += '<div class="docs-steps">';
  html += '<div class="docs-step"><div class="docs-step-num">1</div><div class="docs-step-content">Dans l\'historique, cliquez sur <strong>&#9998;</strong> (crayon)</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">2</div><div class="docs-step-content">Modifiez les champs souhaités (CA, Offres, BC)</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">3</div><div class="docs-step-content">Ajoutez ou supprimez des RDV si nécessaire</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">4</div><div class="docs-step-content">Cliquez sur <strong>Enregistrer</strong></div></div>';
  html += '</div>';
  html += '</div>';

  // Supprimer
  html += '<div class="docs-section" id="docs-hist-supprimer" style="display:none;">';
  html += '<div class="docs-breadcrumb">Collectes &rsaquo; Historique &rsaquo; Supprimer</div>';
  html += '<h2 class="docs-title">&#10005; Supprimer une collecte</h2>';
  html += '<div class="docs-steps">';
  html += '<div class="docs-step"><div class="docs-step-num">1</div><div class="docs-step-content">Dans l\'historique, cliquez sur <strong>&#10005;</strong> (croix rouge)</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">2</div><div class="docs-step-content">Confirmez la suppression dans la boîte de dialogue</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">3</div><div class="docs-step-content">La collecte et ses RDV associés sont supprimés</div></div>';
  html += '</div>';
  html += '<div class="docs-callout docs-callout-danger">';
  html += '<strong>&#128308; Attention</strong> : Cette action est irréversible. Les RDV associés sont également supprimés.';
  html += '</div>';
  html += '</div>';

  // ===== RDV =====
  // Statuts
  html += '<div class="docs-section" id="docs-rdv-statuts" style="display:none;">';
  html += '<div class="docs-breadcrumb">Rendez-vous &rsaquo; Statuts</div>';
  html += '<h2 class="docs-title">&#128197; Comprendre les statuts des RDV</h2>';
  html += '<p class="docs-text">Chaque RDV passe par un cycle de statuts :</p>';
  html += '<div class="docs-flow">';
  html += '<div class="docs-flow-item" style="border-color:#3b82f6;"><div class="docs-flow-label">Prévu</div><div class="docs-flow-desc">RDV planifié, pas encore effectué</div></div>';
  html += '<div class="docs-flow-arrow">&#10132;</div>';
  html += '<div class="docs-flow-item" style="border-color:#10b981;"><div class="docs-flow-label">Réalisé</div><div class="docs-flow-desc">RDV effectué, rencontre réalisée</div></div>';
  html += '<div class="docs-flow-arrow">&#10132;</div>';
  html += '<div class="docs-flow-item" style="border-color:#f59e0b;"><div class="docs-flow-label">Offre</div><div class="docs-flow-desc">Offre envoyée au prospect</div></div>';
  html += '<div class="docs-flow-arrow">&#10132;</div>';
  html += '<div class="docs-flow-item" style="border-color:#8b5cf6;"><div class="docs-flow-label">BC Signé</div><div class="docs-flow-desc">Bon de commande signé</div></div>';
  html += '</div>';
  html += '<div class="docs-callout docs-callout-info">';
  html += '<strong>&#128161;</strong> Vous pouvez changer le statut à tout moment depuis le calendrier, sauf si la collecte associée est déjà validée.';
  html += '</div>';
  html += '</div>';

  // Modifier RDV
  html += '<div class="docs-section" id="docs-rdv-modifier" style="display:none;">';
  html += '<div class="docs-breadcrumb">Rendez-vous &rsaquo; Modifier</div>';
  html += '<h2 class="docs-title">&#9998; Modifier le statut d\'un RDV</h2>';
  html += '<div class="docs-steps">';
  html += '<div class="docs-step"><div class="docs-step-num">1</div><div class="docs-step-content">Ouvrez le <strong>calendrier</strong></div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">2</div><div class="docs-step-content">Cliquez sur le jour concerné</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">3</div><div class="docs-step-content">Cliquez sur le RDV à modifier</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">4</div><div class="docs-step-content">Changez le <strong>statut</strong> dans le menu déroulant</div></div>';
  html += '<div class="docs-step"><div class="docs-step-num">5</div><div class="docs-step-content">Cliquez sur <strong>Enregistrer</strong></div></div>';
  html += '</div>';
  html += '</div>';

  // Supprimer RDV
  html += '<div class="docs-section" id="docs-rdv-supprimer" style="display:none;">';
  html += '<div class="docs-breadcrumb">Rendez-vous &rsaquo; Supprimer</div>';
  html += '<h2 class="docs-title">&#10005; Supprimer un RDV</h2>';
  html += '<p class="docs-text">Depuis le calendrier, ouvrez le détail du RDV et cliquez sur <strong>Supprimer</strong>. Confirmez l\'action.</p>';
  html += '<div class="docs-callout docs-callout-warning">';
  html += '<strong>&#9888;&#65039;</strong> Un RDV supprimé ne peut pas être récupéré.';
  html += '</div>';
  html += '</div>';

  // ===== VISUALISATION =====
  // Dashboard
  html += '<div class="docs-section" id="docs-dashboard" style="display:none;">';
  html += '<div class="docs-breadcrumb">Visualisation &rsaquo; Tableau de bord</div>';
  html += '<h2 class="docs-title">&#128202; Tableau de bord</h2>';
  html += '<p class="docs-text">Vue d\'ensemble de votre activité avec KPIs, graphiques et dernières collectes.</p>';
  html += '<div class="docs-callout docs-callout-tip">';
  html += '<strong>&#128161;</strong> Le tableau de bord se met à jour automatiquement quand vous saisissez une nouvelle collecte.';
  html += '</div>';
  html += '</div>';

  // KPIs
  html += '<div class="docs-section" id="docs-dash-kpis" style="display:none;">';
  html += '<div class="docs-breadcrumb">Visualisation &rsaquo; Tableau de bord &rsaquo; KPIs</div>';
  html += '<h2 class="docs-title">&#127919; Comprendre les KPIs</h2>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>KPI</th><th>Calcul</th><th>Interprétation</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><strong>CA Total</strong></td><td>Somme de tous les CA validés</td><td>Votre chiffre d\'affaires total</td></tr>';
  html += '<tr><td><strong>Offres</strong></td><td>Somme des offres émises</td><td>Votre activité de prospection</td></tr>';
  html += '<tr><td><strong>BC Signés</strong></td><td>Somme des bons de commande</td><td>Vos ventes concrètes</td></tr>';
  html += '<tr><td><strong>RDV</strong></td><td>Total des rendez-vous planifiés</td><td>Votre engagement terrain</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // Graphiques
  html += '<div class="docs-section" id="docs-dash-graphs" style="display:none;">';
  html += '<div class="docs-breadcrumb">Visualisation &rsaquo; Tableau de bord &rsaquo; Graphiques</div>';
  html += '<h2 class="docs-title">&#128200; Les graphiques du tableau de bord</h2>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Graphique</th><th>Type</th><th>Données affichées</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><strong>CA (M FCFA)</strong></td><td>Ligne</td><td>Évolution de votre chiffre d\'affaires</td></tr>';
  html += '<tr><td><strong>Offres</strong></td><td>Donut</td><td>Total des offres émises</td></tr>';
  html += '<tr><td><strong>BC</strong></td><td>Donut</td><td>Total des bons de commande</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // Calendrier
  html += '<div class="docs-section" id="docs-calendrier" style="display:none;">';
  html += '<div class="docs-breadcrumb">Visualisation &rsaquo; Calendrier</div>';
  html += '<h2 class="docs-title">&#128197; Le calendrier</h2>';
  html += '<p class="docs-text">Visualisez vos RDV et collectes du mois sous forme de grille ou de timeline.</p>';
  html += '<div class="docs-callout docs-callout-info">';
  html += '<strong>&#128161;</strong> Le calendrier se charge automatiquement avec les données du mois en cours.';
  html += '</div>';
  html += '</div>';

  // Navigation calendrier
  html += '<div class="docs-section" id="docs-cal-navigation" style="display:none;">';
  html += '<div class="docs-breadcrumb">Visualisation &rsaquo; Calendrier &rsaquo; Navigation</div>';
  html += '<h2 class="docs-title">&#128261; Naviguer dans le calendrier</h2>';
  html += '<ul class="docs-list">';
  html += '<li><strong>Flèches &#9664; &#9654;</strong> : mois précédent / suivant</li>';
  html += '<li><strong>Vue Mois</strong> : grille du mois avec indicateurs par jour</li>';
  html += '<li><strong>Timeline</strong> : liste chronologique de tous les RDV</li>';
  html += '<li><strong>Badge nombre</strong> : indique le nombre d\'éléments sur un jour</li>';
  html += '</ul>';
  html += '</div>';

  // Couleurs calendrier
  html += '<div class="docs-section" id="docs-cal-couleurs" style="display:none;">';
  html += '<div class="docs-breadcrumb">Visualisation &rsaquo; Calendrier &rsaquo; Codes couleur</div>';
  html += '<h2 class="docs-title">&#127912; Codes couleur du calendrier</h2>';
  html += '<h3 class="docs-subtitle">Collectes</h3>';
  html += '<div class="docs-grid docs-grid-2">';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#60a5fa;"></span> <strong>Brouillon</strong> — Collecte non validée</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#f59e0b;"></span> <strong>Validée</strong> — En attente de l\'admin</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#34d399;"></span> <strong>Approuvée</strong> — Confirmée par l\'admin</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#f87171;"></span> <strong>Rejetée</strong> — Refusée par l\'admin</div>';
  html += '</div>';
  html += '<h3 class="docs-subtitle">RDV</h3>';
  html += '<div class="docs-grid docs-grid-2">';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#3b82f6;"></span> <strong>Prévu</strong></div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#10b981;"></span> <strong>Réalisé</strong></div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#f59e0b;"></span> <strong>Offre</strong></div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#8b5cf6;"></span> <strong>BC Signé</strong></div>';
  html += '</div>';
  html += '</div>';

  // Interactions calendrier
  html += '<div class="docs-section" id="docs-cal-interactions" style="display:none;">';
  html += '<div class="docs-breadcrumb">Visualisation &rsaquo; Calendrier &rsaquo; Interactions</div>';
  html += '<h2 class="docs-title">&#128433; Interagir avec le calendrier</h2>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Action</th><th>Résultat</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td>Clic sur un jour vide</td><td>Rien ne se passe</td></tr>';
  html += '<tr><td>Clic sur 1 RDV</td><td>Ouvre le modal d\'édition directement</td></tr>';
  html += '<tr><td>Clic sur plusieurs éléments</td><td>Affiche la liste (collectes + RDV)</td></tr>';
  html += '<tr><td>Clic sur une collecte dans la liste</td><td>Ouvre le détail de la collecte</td></tr>';
  html += '<tr><td>Clic sur un RDV dans la liste</td><td>Ouvre l\'édition du RDV</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // ===== OUTILS =====
  // Notifications
  html += '<div class="docs-section" id="docs-notifications" style="display:none;">';
  html += '<div class="docs-breadcrumb">Outils &rsaquo; Notifications</div>';
  html += '<h2 class="docs-title">&#128276; Notifications</h2>';
  html += '<p class="docs-text">Les notifications vous informent en temps réel de l\'évolution de vos collectes.</p>';
  html += '<h3 class="docs-subtitle">Types de notifications</h3>';
  html += '<ul class="docs-list">';
  html += '<li><strong>Collecte validée</strong> : votre collecte est en attente</li>';
  html += '<li><strong>Collecte approuvée</strong> : votre collecte est acceptée</li>';
  html += '<li><strong>Collecte rejetée</strong> : votre collecte est refusée</li>';
  html += '<li><strong>Rappel</strong> : rappel de tâche</li>';
  html += '<li><strong>Système</strong> : informations importantes</li>';
  html += '</ul>';
  html += '<h3 class="docs-subtitle">Gestion</h3>';
  html += '<ul class="docs-list">';
  html += '<li>Cliquez sur la <strong>cloche</strong> pour ouvrir le panneau</li>';
  html += '<li>Filtrez par type (toutes, non lues, etc.)</li>';
  html += '<li>Cliquez sur une notification pour la marquer comme lue</li>';
  html += '<li>Activez/désactivez le son avec le bouton speaker</li>';
  html += '</ul>';
  html += '</div>';

  // Dark mode
  html += '<div class="docs-section" id="docs-darkmode" style="display:none;">';
  html += '<div class="docs-breadcrumb">Outils &rsaquo; Mode sombre</div>';
  html += '<h2 class="docs-title">&#127769; Mode sombre</h2>';
  html += '<p class="docs-text">Basculer entre le mode clair et sombre pour plus de confort visuel, surtout en faible luminosité.</p>';
  html += '<h3 class="docs-subtitle">3 façons d\'activer</h3>';
  html += '<ol class="docs-list docs-list-ordered">';
  html += '<li>Bouton <strong>&#127769;</strong> dans le header</li>';
  html += '<li>Menu <strong>Paramètres &rsaquo; Apparence</strong></li>';
  html += '<li>Menu <strong>avatar &rsaquo; Apparence</strong></li>';
  html += '</ol>';
  html += '<p class="docs-text">Le choix est sauvegardé automatiquement et persiste entre les sessions.</p>';
  html += '</div>';

  // Raccourcis
  html += '<div class="docs-section" id="docs-raccourcis" style="display:none;">';
  html += '<div class="docs-breadcrumb">Outils &rsaquo; Raccourcis</div>';
  html += '<h2 class="docs-title">&#9000;&#65039; Raccourcis clavier</h2>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Raccourci</th><th>Action</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><kbd>Ctrl</kbd> + <kbd>B</kbd></td><td>Replier/déplier la sidebar</td></tr>';
  html += '<tr><td><kbd>Echap</kbd></td><td>Fermer la sidebar mobile ou un modal</td></tr>';
  html += '<tr><td><kbd>Entrée</kbd></td><td>Envoyer le formulaire (dans un champ)</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // Mobile
  html += '<div class="docs-section" id="docs-mobile" style="display:none;">';
  html += '<div class="docs-breadcrumb">Outils &rsaquo; Version mobile</div>';
  html += '<h2 class="docs-title">&#128241; Utiliser sur mobile</h2>';
  html += '<p class="docs-text">IPCE Dashboard est optimisé pour les smartphones. Vous pouvez l\'installer comme une application (PWA).</p>';
  html += '<h3 class="docs-subtitle">Installer l\'app</h3>';
  html += '<ol class="docs-list docs-list-ordered">';
  html += '<li>Ouvrez le dashboard dans Safari (iOS) ou Chrome (Android)</li>';
  html += '<li>Cliquez sur "Ajouter à l\'écran d\'accueil"</li>';
  html += '<li>L\'app s\'ouvre en plein écran, comme une app native</li>';
  html += '</ol>';
  html += '<h3 class="docs-subtitle">Fonctionnalités mobiles</h3>';
  html += '<ul class="docs-list">';
  html += '<li>Sidebar : glissez depuis la gauche ou utilisez le bouton &#9776;</li>';
  html += '<li>Formulaires : inputs adaptés au clavier mobile</li>';
  html += '<li>Notifications : son et vibrations (si activés)</li>';
  html += '<li>Hors ligne : accès en lecture seule aux données cachées</li>';
  html += '</ul>';
  html += '</div>';

  // ===== AIDE =====
  // Statuts
  html += '<div class="docs-section" id="docs-statuts" style="display:none;">';
  html += '<div class="docs-breadcrumb">Aide &rsaquo; Signification des statuts</div>';
  html += '<h2 class="docs-title">&#127919; Signification des statuts</h2>';
  html += '<h3 class="docs-subtitle">Statuts de collecte</h3>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Statut</th><th>Couleur</th><th>Signification</th><th>Action possible</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><strong>Brouillon</strong></td><td><span class="docs-badge" style="background:#dbeafe;color:#1d4ed8;">brouillon</span></td><td>Collecte en cours de rédaction</td><td>Modifier, Supprimer, Valider</td></tr>';
  html += '<tr><td><strong>Validée</strong></td><td><span class="docs-badge" style="background:#fef3c7;color:#b45309;">validée</span></td><td>Envoyée à l\'admin, en attente</td><td>Aucune</td></tr>';
  html += '<tr><td><strong>Approuvée</strong></td><td><span class="docs-badge" style="background:#d1fae5;color:#047857;">approuvée</span></td><td>Acceptée par l\'admin</td><td>Aucune</td></tr>';
  html += '<tr><td><strong>Rejetée</strong></td><td><span class="docs-badge" style="background:#fee2e2;color:#b91c1c;">rejetée</span></td><td>Refusée par l\'admin</td><td>Aucune</td></tr>';
  html += '</tbody></table></div>';
  html += '<h3 class="docs-subtitle">Statuts de RDV</h3>';
  html += '<div class="docs-table-wrap"><table class="docs-table">';
  html += '<thead><tr><th>Statut</th><th>Couleur</th><th>Signification</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><strong>Prévu</strong></td><td><span class="docs-dot-inline" style="background:#3b82f6;"></span> Bleu</td><td>RDV planifié, pas encore effectué</td></tr>';
  html += '<tr><td><strong>Réalisé</strong></td><td><span class="docs-dot-inline" style="background:#10b981;"></span> Vert</td><td>RDV effectué</td></tr>';
  html += '<tr><td><strong>Offre</strong></td><td><span class="docs-dot-inline" style="background:#f59e0b;"></span> Orange</td><td>Offre envoyée au prospect</td></tr>';
  html += '<tr><td><strong>BC Signé</strong></td><td><span class="docs-dot-inline" style="background:#8b5cf6;"></span> Violet</td><td>Bon de commande signé</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // FAQ
  html += '<div class="docs-section" id="docs-faq" style="display:none;">';
  html += '<div class="docs-breadcrumb">Aide &rsaquo; FAQ</div>';
  html += '<h2 class="docs-title">&#10067; Questions fréquentes</h2>';
  html += '<div class="docs-faq">';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Pourquoi ne puis-je pas modifier une collecte ?</div>';
  html += '<div class="docs-faq-a">Une collecte avec le statut "validée" ou "approuvée" ne peut plus être modifiée. Seules les collectes en <strong>brouillon</strong> sont éditables.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Comment supprimer une collecte ?</div>';
  html += '<div class="docs-faq-a">Dans <strong>Historique</strong>, cliquez sur &#10005; (rouge) à droite de la ligne. Confirmez la suppression. Seuls les brouillons peuvent être supprimés.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Que signifient les couleurs dans le calendrier ?</div>';
  html += '<div class="docs-faq-a">Voir la section <strong>Codes couleur du calendrier</strong> dans la documentation.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Comment voir les détails d\'une collecte ?</div>';
  html += '<div class="docs-faq-a">Dans <strong>Historique</strong>, cliquez sur &#128065; (oeil). Un modal affiche CA, offres, BC, statut et les RDVs associés.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Ma collecte a été rejetée, que faire ?</div>';
  html += '<div class="docs-faq-a">Contactez votre administrateur pour connaître la raison. Vous pouvez créer une nouvelle collecte avec les données corrigées.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Le bouton + pour ajouter un RDV ne fonctionne pas</div>';
  html += '<div class="docs-faq-a">Vérifiez que le <strong>prospect</strong> et la <strong>date</strong> sont remplis. Le bouton ne réagit que si ces deux champs sont renseignés.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Comment contacter l\'administrateur ?</div>';
  html += '<div class="docs-faq-a">Utilisez les canaux de communication de votre entreprise. Le dashboard ne dispose pas de messagerie interne.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item" onclick="this.classList.toggle(\'open\')">';
  html += '<div class="docs-faq-q">&#9660; Les notifications n\'apparaissent pas</div>';
  html += '<div class="docs-faq-a">Vérifiez que le WebSocket est actif (la cloche doit être visible). Si le problème persiste, rafraîchissez la page.</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '</div>'; // docs-content
  html += '</div>'; // docs-layout

  el.innerHTML = html;
};

// --- Navigation docs ---
function docsNavigate(section, btn) {
  // Hide all sections
  document.querySelectorAll('.docs-section').forEach(function(el) { el.style.display = 'none'; });
  // Show target
  var target = document.getElementById('docs-' + section);
  if (target) target.style.display = '';
  // Update sidebar active
  document.querySelectorAll('.docs-nav-item').forEach(function(el) { el.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  // Auto-open parent group
  if (btn) {
    var group = btn.closest('.docs-nav-group');
    if (group && !group.classList.contains('open')) {
      group.classList.add('open');
    }
  }
}

function docsToggleGroup(toggleEl) {
  var group = toggleEl.closest('.docs-nav-group');
  if (group) group.classList.toggle('open');
}

/* ========================================
   SECTION — Documentation (Guide Complet)
   ======================================== */

window.__load_docs = function() {
  var el = document.getElementById('section-docs-content');
  if (!el) return;

  var html = '';

  // Navigation rapide
  html += '<div class="docs-nav">';
  html += '<div class="docs-nav-title">Dans cette page</div>';
  html += '<a class="docs-nav-link" href="#docs-intro">Introduction</a>';
  html += '<a class="docs-nav-link" href="#docs-dashboard">Tableau de bord</a>';
  html += '<a class="docs-nav-link" href="#docs-collecte">Saisir une collecte</a>';
  html += '<a class="docs-nav-link" href="#docs-rdv">Gestion des RDV</a>';
  html += '<a class="docs-nav-link" href="#docs-historique">Historique</a>';
  html += '<a class="docs-nav-link" href="#docs-calendrier">Calendrier</a>';
  html += '<a class="docs-nav-link" href="#docs-notifications">Notifications</a>';
  html += '<a class="docs-nav-link" href="#docs-darkmode">Mode sombre</a>';
  html += '<a class="docs-nav-link" href="#docs-shortcuts">Raccourcis</a>';
  html += '<a class="docs-nav-link" href="#docs-faq">FAQ</a>';
  html += '</div>';

  // --- Introduction ---
  html += '<div class="docs-card" id="docs-intro">';
  html += '<h3 class="docs-title">&#128218; Introduction</h3>';
  html += '<p class="docs-text"><strong>IPCE Dashboard</strong> est votre outil de pilotage commercial. Il vous permet de suivre vos performances, g&#233;rer vos collectes, planifier vos rendez-vous et visualiser votre activit&#233; en temps r&#233;el.</p>';
  html += '<div class="docs-callout docs-callout-info">';
  html += '<strong>&#128161; &#201;tes-vous nouveau ?</strong> Commencez par la section "Nouvelle Collecte" pour saisir votre premi&#232;re collecte. Le reste viendra naturellement.';
  html += '</div>';
  html += '<p class="docs-text"><strong>Votre r&#244;le :</strong> En tant que commercial, vous pouvez :</p>';
  html += '<ul class="docs-list">';
  html += '<li>Saisir et valider des collectes (CA, offres, BC)</li>';
  html += '<li>Ajouter des rendez-vous (RDV) &#224; vos collectes</li>';
  html += '<li>Consulter votre historique et vos graphiques</li>';
  html += '<li>Planifier vos RDV via le calendrier</li>';
  html += '<li>Suivre vos performances via le tableau de bord</li>';
  html += '</ul>';
  html += '</div>';

  // --- Tableau de bord ---
  html += '<div class="docs-card" id="docs-dashboard">';
  html += '<h3 class="docs-title">&#128202; Tableau de bord</h3>';
  html += '<p class="docs-text">Le tableau de bord est votre vue d&#8217;ensemble. Il affiche :</p>';
  html += '<div class="docs-grid">';
  html += '<div class="docs-grid-item"><div class="docs-grid-icon">&#128176;</div><div class="docs-grid-label">CA Total</div><div class="docs-grid-desc">Chiffre d&#8217;affaires total de vos collectes valid&#233;es</div></div>';
  html += '<div class="docs-grid-item"><div class="docs-grid-icon">&#128196;</div><div class="docs-grid-label">Offres</div><div class="docs-grid-desc">Nombre total d&#8217;offres &#233;mises</div></div>';
  html += '<div class="docs-grid-item"><div class="docs-grid-icon">&#9989;</div><div class="docs-grid-label">BC Sign&#233;s</div><div class="docs-grid-desc">Bons de commande sign&#233;s</div></div>';
  html += '<div class="docs-grid-item"><div class="docs-grid-icon">&#128197;</div><div class="docs-grid-label">RDV</div><div class="docs-grid-desc">Rendez-vous planifi&#233;s</div></div>';
  html += '</div>';
  html += '<p class="docs-text">Vous y trouverez &#233;galement :</p>';
  html += '<ul class="docs-list">';
  html += '<li><strong>3 mini graphiques</strong> : &#233;volution du CA, r&#233;partition des offres et BC</li>';
  html += '<li><strong>Boutons d&#8217;action rapide</strong> : acc&#233;der directement aux autres sections</li>';
  html += '<li><strong>Derni&#232;res collectes</strong> : vos 3 derni&#232;res saisies avec leur statut</li>';
  html += '</ul>';
  html += '<div class="docs-callout docs-callout-tip">';
  html += '<strong>&#128161; Astuce</strong> : Cliquez sur "Saisir une collecte" pour commencer imm&#233;diatement.';
  html += '</div>';
  html += '</div>';

  // --- Saisir une collecte ---
  html += '<div class="docs-card" id="docs-collecte">';
  html += '<h3 class="docs-title">&#9998;&#65039; Saisir une collecte</h3>';
  html += '<p class="docs-text">C&#8217;est la fonction principale. Pour chaque journ&#233;e de travail, vous saisissez vos r&#233;sultats :</p>';
  html += '<h4 class="docs-subtitle">1. Remplir les donn&#233;es</h4>';
  html += '<div class="docs-table-wrap">';
  html += '<table class="docs-table">';
  html += '<thead><tr><th>Champ</th><th>Description</th><th>Exemple</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><strong>CA (FCFA)</strong></td><td>Chiffre d&#8217;affaires r&#233;alis&#233;</td><td>2 500 000</td></tr>';
  html += '<tr><td><strong>Offres &#233;mises</strong></td><td>Nombre d&#8217;offres envoy&#233;es aux prospects</td><td>5</td></tr>';
  html += '<tr><td><strong>BC Sign&#233;s</strong></td><td>Bons de commande sign&#233;s</td><td>2</td></tr>';
  html += '</tbody></table></div>';
  html += '<h4 class="docs-subtitle">2. Ajouter des RDV (optionnel)</h4>';
  html += '<p class="docs-text">Pour chaque rendez-vous li&#233; &#224; cette collecte :</p>';
  html += '<ol class="docs-list docs-list-ordered">';
  html += '<li>Entrez le <strong>nom du prospect</strong></li>';
  html += '<li>La <strong>date</strong> est pr&#233;-remplie avec aujourd&#8217;hui (modifiable)</li>';
  html += '<li>Ajoutez le <strong>montant</strong> en millions FCFA</li>';
  html += '<li>S&#233;lectionnez le <strong>statut</strong> : Pr&#233;vu, R&#233;alis&#233;, Offre, ou BC Sign&#233;</li>';
  html += '<li>Cliquez sur <strong>+</strong> pour ajouter</li>';
  html += '</ol>';
  html += '<div class="docs-callout docs-callout-warning">';
  html += '<strong>&#9888;&#65039; Important</strong> : Le bouton <strong>+</strong> ne fonctionne que si le prospect et la date sont remplis.';
  html += '</div>';
  html += '<h4 class="docs-subtitle">3. Sauvegarder ou Valider</h4>';
  html += '<div class="docs-grid docs-grid-2">';
  html += '<div class="docs-action-card">';
  html += '<div class="docs-action-icon">&#128190;</div>';
  html += '<div class="docs-action-title">Sauvegarder</div>';
  html += '<div class="docs-action-desc">Enregistre la collecte en <strong>brouillon</strong>. Vous pourrez la modifier ou la supprimer plus tard.</div>';
  html += '</div>';
  html += '<div class="docs-action-card docs-action-warn">';
  html += '<div class="docs-action-icon">&#10003;</div>';
  html += '<div class="docs-action-title">Valider et envoyer</div>';
  html += '<div class="docs-action-desc">Enregistre et <strong>valide</strong> la collecte. L&#8217;administrateur est notifi&#233;. <strong>Plus possible de modifier.</strong></div>';
  html += '</div>';
  html += '</div>';
  html += '<div class="docs-callout docs-callout-danger">';
  html += '<strong>&#128308; Attention</strong> : Une collecte valid&#233;e ne peut plus &#234;tre modifi&#233;e ni supprim&#233;e. V&#233;rifiez vos donn&#233;es avant de valider.';
  html += '</div>';
  html += '</div>';

  // --- Gestion des RDV ---
  html += '<div class="docs-card" id="docs-rdv">';
  html += '<h3 class="docs-title">&#128197; Gestion des RDV</h3>';
  html += '<p class="docs-text">Chaque rendez-vous est associ&#233; &#224; une collecte. Voici les statuts possibles :</p>';
  html += '<div class="docs-grid docs-grid-4">';
  html += '<div class="docs-status-card" style="border-left: 3px solid #3b82f6;"><div class="docs-status-label">Pr&#233;vu</div><div class="docs-status-desc">RDV planifi&#233;, pas encore effectu&#233;</div></div>';
  html += '<div class="docs-status-card" style="border-left: 3px solid #10b981;"><div class="docs-status-label">R&#233;alis&#233;</div><div class="docs-status-desc">RDV effectu&#233;</div></div>';
  html += '<div class="docs-status-card" style="border-left: 3px solid #f59e0b;"><div class="docs-status-label">Offre</div><div class="docs-status-desc">Offre envoy&#233;e au prospect</div></div>';
  html += '<div class="docs-status-card" style="border-left: 3px solid #8b5cf6;"><div class="docs-status-label">BC Sign&#233;</div><div class="docs-status-desc">Bon de commande sign&#233;</div></div>';
  html += '</div>';
  html += '<h4 class="docs-subtitle">Modifier un RDV</h4>';
  html += '<p class="docs-text">Depuis le <strong>calendrier</strong>, cliquez sur un jour pour voir les RDV. Cliquez sur un RDV pour en modifier le statut ou le supprimer.</p>';
  html += '<div class="docs-callout docs-callout-warning">';
  html += '<strong>&#9888;&#65039;</strong> Les RDV d&#8217;une collecte valid&#233;e ne peuvent plus &#234;tre modifi&#233;s.';
  html += '</div>';
  html += '</div>';

  // --- Historique ---
  html += '<div class="docs-card" id="docs-historique">';
  html += '<h3 class="docs-title">&#128203; Historique des collectes</h3>';
  html += '<p class="docs-text">Retrouvez toutes vos collectes pass&#233;es dans un tableau avec :</p>';
  html += '<ul class="docs-list">';
  html += '<li><strong>Date</strong> de cr&#233;ation</li>';
  html += '<li><strong>CA, Offres, BC, RDV</strong> : vos r&#233;sultats</li>';
  html += '<li><strong>Statut</strong> : brouillon, valid&#233;e, approuv&#233;e, rejet&#233;e</li>';
  html += '<li><strong>Actions</strong> : Voir, Modifier, Supprimer (brouillons uniquement)</li>';
  html += '</ul>';
  html += '<h4 class="docs-subtitle">Actions disponibles</h4>';
  html += '<div class="docs-table-wrap">';
  html += '<table class="docs-table">';
  html += '<thead><tr><th>Bouton</th><th>Action</th><th>Conditions</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td>&#128065;</td><td><strong>Voir</strong> : d&#233;tails de la collecte</td><td>Tous les statuts</td></tr>';
  html += '<tr><td>&#9998;</td><td><strong>Modifier</strong> : formulaire &#233;ditable</td><td>Brouillon uniquement</td></tr>';
  html += '<tr><td>&#10005;</td><td><strong>Supprimer</strong> : confirmation requise</td><td>Brouillon uniquement</td></tr>';
  html += '</tbody></table></div>';
  html += '<div class="docs-callout docs-callout-info">';
  html += '<strong>&#128161;</strong> Une collecte approuv&#233;e par l&#8217;admin est signal&#233;e par un statut vert. Vous ne pouvez plus la modifier.';
  html += '</div>';
  html += '</div>';

  // --- Calendrier ---
  html += '<div class="docs-card" id="docs-calendrier">';
  html += '<h3 class="docs-title">&#128197; Calendrier</h3>';
  html += '<p class="docs-text">Le calendrier affiche vos RDV et collectes du mois.</p>';
  html += '<h4 class="docs-subtitle">Navigation</h4>';
  html += '<ul class="docs-list">';
  html += '<li><strong>Fl&#232;ches &#9664; &#9654;</strong> : mois pr&#233;c&#233;dent / suivant</li>';
  html += '<li><strong>Vue Mois</strong> : grille du mois avec les jours</li>';
  html += '<li><strong>Timeline</strong> : liste chronologique des RDV</li>';
  html += '</ul>';
  html += '<h4 class="docs-subtitle">Comprendre les indicateurs</h4>';
  html += '<div class="docs-grid docs-grid-2">';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#60a5fa;"></span> Brouillon (collecte non valid&#233;e)</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#f59e0b;"></span> Valid&#233;e (en attente admin)</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#34d399;"></span> Approuv&#233;e (confirm&#233;e par admin)</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#f87171;"></span> Rejet&#233;e</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#3b82f6;"></span> RDV Pr&#233;vu</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#10b981;"></span> RDV R&#233;alis&#233;</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#f59e0b;"></span> RDV Offre</div>';
  html += '<div class="docs-legend"><span class="docs-dot" style="background:#8b5cf6;"></span> RDV BC Sign&#233;</div>';
  html += '</div>';
  html += '<h4 class="docs-subtitle">Interagir avec le calendrier</h4>';
  html += '<ul class="docs-list">';
  html += '<li><strong>Clic sur un jour sans donn&#233;es</strong> : rien ne se passe</li>';
  html += '<li><strong>Clic sur un jour avec 1 RDV</strong> : ouvre directement le modal d&#8217;&#233;dition</li>';
  html += '<li><strong>Clic sur un jour avec plusieurs &#233;l&#233;ments</strong> : affiche la liste (collectes + RDV)</li>';
  html += '<li><strong>Badge nombre</strong> : indique le nombre total d&#8217;&#233;l&#233;ments ce jour</li>';
  html += '</ul>';
  html += '</div>';

  // --- Notifications ---
  html += '<div class="docs-card" id="docs-notifications">';
  html += '<h3 class="docs-title">&#128276; Notifications</h3>';
  html += '<p class="docs-text">Les notifications vous informent en temps r&#233;el :</p>';
  html += '<ul class="docs-list">';
  html += '<li><strong>Collecte valid&#233;e</strong> : vous &#234;tes notifi&#233; quand votre collecte est approuv&#233;e ou rejet&#233;e</li>';
  html += '<li><strong>Nouveau rappel</strong> : des rappels vous sont envoy&#233;s</li>';
  html += '<li><strong>Informations syst&#232;me</strong> : mises &#224; jour importantes</li>';
  html += '</ul>';
  html += '<h4 class="docs-subtitle">G&#233;rer vos notifications</h4>';
  html += '<ul class="docs-list">';
  html += '<li>Cliquez sur la <strong>cloche</strong> pour ouvrir le panneau</li>';
  html += '<li>Filtrez par type (toutes, non lues, en attente, etc.)</li>';
  html += '<li>Cliquez sur une notification pour la marquer comme lue</li>';
  html += '<li>Utilisez "Tout marquer comme lu" pour tout acquitter</li>';
  html += '<li>Activez/d&#233;sactivez le <strong>son</strong> avec le bouton speaker</li>';
  html += '</ul>';
  html += '<div class="docs-callout docs-callout-tip">';
  html += '<strong>&#128161;</strong> Les notifications apparaissent &#233;galement sur votre mobile si vous avez install&#233; l&#8217;application (PWA).';
  html += '</div>';
  html += '</div>';

  // --- Dark mode ---
  html += '<div class="docs-card" id="docs-darkmode">';
  html += '<h3 class="docs-title">&#127769; Mode sombre</h3>';
  html += '<p class="docs-text">Basculer entre le mode clair et sombre pour plus de confort visuel.</p>';
  html += '<h4 class="docs-subtitle">Comment activer</h4>';
  html += '<ol class="docs-list docs-list-ordered">';
  html += '<li>Cliquez sur l&#8217;ic&#244;ne <strong>&#127769;</strong> (lune) dans le header</li>';
  html += '<li>Ou allez dans <strong>Param&#232;tres &gt; Apparence</strong></li>';
  html += '<li>Ou utilisez le menu d&#8217;utilisateur (clic sur votre avatar)</li>';
  html += '</ol>';
  html += '<p class="docs-text">Le choix est <strong>sauvegard&#233;</strong> automatiquement et persiste entre les sessions.</p>';
  html += '</div>';

  // --- Raccourcis ---
  html += '<div class="docs-card" id="docs-shortcuts">';
  html += '<h3 class="docs-title">&#9000;&#65039; Raccourcis clavier</h3>';
  html += '<div class="docs-table-wrap">';
  html += '<table class="docs-table">';
  html += '<thead><tr><th>Raccourci</th><th>Action</th></tr></thead>';
  html += '<tbody>';
  html += '<tr><td><kbd>Ctrl</kbd> + <kbd>B</kbd></td><td>Replier/d&#233;plier la sidebar</td></tr>';
  html += '<tr><td><kbd>Espace</kbd></td><td>Envoyer le formulaire (quand un input est focus)</td></tr>';
  html += '<tr><td><kbd>Echap</kbd></td><td>Fermer la sidebar mobile / un modal ouvert</td></tr>';
  html += '</tbody></table></div>';
  html += '</div>';

  // --- FAQ ---
  html += '<div class="docs-card" id="docs-faq">';
  html += '<h3 class="docs-title">&#10067; Questions fr&#233;quentes</h3>';
  html += '<div class="docs-faq">';
  html += '<div class="docs-faq-item">';
  html += '<div class="docs-faq-q">Pourquoi ne puis-je pas modifier une collecte ?</div>';
  html += '<div class="docs-faq-a">Une collecte avec le statut "valid&#233;e" ou "approuv&#233;e" ne peut plus &#234;tre modifi&#233;e. Seules les collectes en <strong>brouillon</strong> sont &#233;ditable.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item">';
  html += '<div class="docs-faq-q">Comment supprimer une collecte ?</div>';
  html += '<div class="docs-faq-a">Allez dans <strong>Historique</strong>, cliquez sur le bouton <strong>&#10005;</strong> (rouge) &#224; droite de la ligne. Confirmez la suppression. Seuls les brouillons peuvent &#234;tre supprim&#233;s.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item">';
  html += '<div class="docs-faq-q">Que signifient les couleurs dans le calendrier ?</div>';
  html += '<div class="docs-faq-a">Bleu = RDV Pr&#233;vu, Vert = R&#233;alis&#233;, Orange = Offre, Violet = BC Sign&#233;. Pour les collectes : bleu clair = brouillon, jaune = valid&#233;e, vert = approuv&#233;e.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item">';
  html += '<div class="docs-faq-q">Comment voir les d&#233;tails d&#8217;une collecte ?</div>';
  html += '<div class="docs-faq-a">Dans <strong>Historique</strong>, cliquez sur l&#8217;ic&#244;ne <strong>&#128065;</strong> (oeil). Un modal affiche CA, offres, BC, statut et les RDVs associ&#233;s.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item">';
  html += '<div class="docs-faq-q">Mon collecte a &#233;t&#233; rejet&#233;e, que faire ?</div>';
  html += '<div class="docs-faq-a">Contactez votre administrateur pour conna&#238;tre la raison du rejet. Vous pouvez cr&#233;er une nouvelle collecte avec les donn&#233;es corrig&#233;es.</div>';
  html += '</div>';
  html += '<div class="docs-faq-item">';
  html += '<div class="docs-faq-q">Comment contacter l&#8217;administrateur ?</div>';
  html += '<div class="docs-faq-a">Utilisez les canaux de communication de votre entreprise (email, messagerie interne). Le dashboard ne dispose pas de messagerie interne.</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  el.innerHTML = html;
};

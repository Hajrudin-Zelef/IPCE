async function loadSectionData(url) {
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('Erreur chargement');
    return await res.json();
  } catch (e) {
    console.error('Erreur:', e);
    return null;
  }
}

function renderEmpty(containerId, msg) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '<div class="section-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><p>' + (msg || 'Aucune donnée disponible') + '</p></div>';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCA(v) {
  if (v == null || isNaN(v)) return '0';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v.toFixed(0);
}

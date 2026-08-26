/* ========================================
   DASHBOARD — Charts
   ======================================== */

let chartCA = null, chartPipeline = null;

function renderCharts(collectes) {
  const labels = collectes.map(c => new Date(c.created_at).toLocaleDateString('fr-FR'));
  const caData = collectes.map(c => c.ca / 1e6);
  const offresData = collectes.map(c => c.offres);
  const bcData = collectes.map(c => c.bc);

  if (chartCA) chartCA.destroy();
  chartCA = new Chart(document.getElementById('ch-ca'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'CA (M)',
        data: caData,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102,126,234,0.1)',
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Evolution du CA' } },
    },
  });

  if (chartPipeline) chartPipeline.destroy();
  chartPipeline = new Chart(document.getElementById('ch-pipeline'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Offres', data: offresData, backgroundColor: '#764ba2' },
        { label: 'BC', data: bcData, backgroundColor: '#f093fb' },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'Pipeline Offres / BC' } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

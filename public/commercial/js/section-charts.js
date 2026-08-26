/* ========================================
   DASHBOARD — Charts
   ======================================== */

let chartCA = null, chartOffres = null, chartBC = null;

window.__load_charts = function() {
  // Load collectes and render charts
  api('GET', '/api/collectes').then(function(res) {
    if (res.ok) return res.json();
  }).then(function(collectes) {
    if (collectes) renderCharts(collectes);
  });
};

function renderCharts(collectes) {
  if (!collectes || collectes.length === 0) return;

  const labels = collectes.map(c => new Date(c.created_at).toLocaleDateString('fr-FR'));
  const caData = collectes.map(c => c.ca / 1e6);

  // Totals per commercial (group by ca)
  const totalOffres = collectes.reduce((s, c) => s + (c.offres || 0), 0);
  const totalBC = collectes.reduce((s, c) => s + (c.bc || 0), 0);
  const totalCA = collectes.reduce((s, c) => s + (c.ca || 0), 0);

  // --- CA Line Chart ---
  if (chartCA) chartCA.destroy();
  chartCA = new Chart(document.getElementById('ch-ca'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'CA (M FCFA)',
        data: caData,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: '#667eea',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200, easing: 'easeOutQuart' },
      plugins: {
        title: { display: true, text: 'Évolution du CA', font: { size: 14, weight: '600' }, color: '#333' },
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30,60,114,0.9)',
          padding: 10, cornerRadius: 8,
          callbacks: { label: ctx => ctx.parsed.y.toFixed(1) + ' M FCFA' },
        },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => v + 'M' } },
        x: { grid: { display: false } },
      },
    },
  });

  // --- Donut factory ---
  function makeDonut(canvasId, label, total, color1, color2, centerLabel) {
    const el = document.getElementById(canvasId);
    if (!el) return null;
    return new Chart(el, {
      type: 'doughnut',
      data: {
        labels: [label, 'Reste'],
        datasets: [{
          data: [total, Math.max(0, total * 0.3)],
          backgroundColor: [color1, 'rgba(200,200,200,0.2)'],
          borderColor: [color2, 'transparent'],
          borderWidth: 2,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: { animateRotate: true, animateScale: true, duration: 1500, easing: 'easeOutBounce' },
        plugins: {
          title: { display: true, text: label, font: { size: 14, weight: '600' }, color: '#333' },
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(30,60,114,0.9)', padding: 10, cornerRadius: 8,
            filter: item => item.dataIndex === 0,
            callbacks: { label: () => centerLabel },
          },
        },
      },
      plugins: [{
        id: 'center_' + canvasId,
        beforeDraw(chart) {
          const { ctx, width, height } = chart;
          ctx.save();
          ctx.font = 'bold 26px Segoe UI, sans-serif';
          ctx.fillStyle = '#333';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(total.toLocaleString('fr-FR'), width / 2, height / 2 - 6);
          ctx.font = '11px Segoe UI, sans-serif';
          ctx.fillStyle = '#999';
          ctx.fillText(centerLabel, width / 2, height / 2 + 16);
          ctx.restore();
        },
      }],
    });
  }

  // --- Offres Donut ---
  if (chartOffres) chartOffres.destroy();
  chartOffres = makeDonut('ch-offres', 'Offres émises', totalOffres, 'rgba(118,75,162,0.85)', '#764ba2', totalOffres + ' offres');

  // --- BC Donut ---
  if (chartBC) chartBC.destroy();
  chartBC = makeDonut('ch-bc', 'BC signés', totalBC, 'rgba(16,185,129,0.85)', '#10b981', totalBC + ' BC');
}

/* ========================================
   DASHBOARD — Charts
   ======================================== */

let chartCA = null, chartPipeline = null;

function renderCharts(collectes) {
  if (!collectes || collectes.length === 0) return;

  const labels = collectes.map(c => new Date(c.created_at).toLocaleDateString('fr-FR'));
  const caData = collectes.map(c => c.ca / 1e6);

  // Totals for donut
  const totalOffres = collectes.reduce((s, c) => s + (c.offres || 0), 0);
  const totalBC = collectes.reduce((s, c) => s + (c.bc || 0), 0);

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
        title: { display: true, text: '\u00c9volution du CA', font: { size: 14, weight: '600' }, color: '#333' },
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(30,60,114,0.9)',
          titleFont: { size: 12 },
          bodyFont: { size: 13 },
          padding: 10,
          cornerRadius: 8,
          callbacks: { label: ctx => ctx.parsed.y.toFixed(1) + ' M FCFA' },
        },
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => v + 'M' } },
        x: { grid: { display: false } },
      },
    },
  });

  // --- Pipeline Donut Chart ---
  if (chartPipeline) chartPipeline.destroy();
  chartPipeline = new Chart(document.getElementById('ch-pipeline'), {
    type: 'doughnut',
    data: {
      labels: ['Offres \u00e9mises', 'BC sign\u00e9s'],
      datasets: [{
        data: [totalOffres, totalBC],
        backgroundColor: [
          'rgba(118, 75, 162, 0.85)',
          'rgba(240, 147, 251, 0.85)',
        ],
        borderColor: ['#764ba2', '#f093fb'],
        borderWidth: 2,
        hoverOffset: 12,
        spacing: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: 'easeOutBounce',
      },
      plugins: {
        title: { display: true, text: 'Pipeline Offres / BC', font: { size: 14, weight: '600' }, color: '#333' },
        legend: {
          position: 'bottom',
          labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 12 } },
        },
        tooltip: {
          backgroundColor: 'rgba(30,60,114,0.9)',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
              return ctx.label + ': ' + ctx.parsed + ' (' + pct + '%)';
            },
          },
        },
      },
    },
    plugins: [{
      id: 'donutCenter',
      beforeDraw(chart) {
        const { ctx, width, height } = chart;
        const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
        ctx.save();
        ctx.font = 'bold 22px Segoe UI, sans-serif';
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, width / 2, height / 2 - 8);
        ctx.font = '11px Segoe UI, sans-serif';
        ctx.fillStyle = '#999';
        ctx.fillText('Total', width / 2, height / 2 + 14);
        ctx.restore();
      },
    }],
  });
}

let chartCA = null;
let chartDonut = null;
let chartBar = null;

const CHART_COLORS = {
  primary: '#E31C23',
  primaryLight: 'rgba(37, 99, 235, 0.1)',
  purple: '#7C3AED',
  purpleLight: 'rgba(124, 58, 237, 0.1)',
  success: '#059669',
  warning: '#F59E0B',
  danger: '#EF4444',
  muted: '#94A3B8',
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 16,
        font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
        color: '#64748B',
      },
    },
    tooltip: {
      backgroundColor: '#0F172A',
      titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
      bodyFont: { family: "'Inter', sans-serif", size: 11 },
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 4,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#94A3B8' },
    },
    y: {
      beginAtZero: true,
      grid: { color: '#F1F5F9' },
      ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#94A3B8' },
    },
  },
};

function renderAreaChart(users) {
  const ctx = document.getElementById('chart-ca');
  if (!ctx) return;

  if (chartCA) chartCA.destroy();

  const labels = users.map(u => u.nom);
  const caData = users.map(u => u.ca / 1e6);
  const objData = users.map(() => 8.5);

  chartCA = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'CA (M)',
          data: caData,
          borderColor: CHART_COLORS.primary,
          backgroundColor: CHART_COLORS.primaryLight,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#fff',
          pointBorderColor: CHART_COLORS.primary,
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
        {
          label: 'Objectif',
          data: objData,
          borderColor: CHART_COLORS.danger,
          borderDash: [5, 5],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      plugins: {
        ...CHART_DEFAULTS.plugins,
        title: { display: false },
      },
    },
  });
}

function renderFunnelChart(totals) {
  const wrapper = document.getElementById('chart-funnel');
  if (!wrapper) return;

  const leadsEstimate = Math.max(totals.rdvCount * 3, 10);

  const steps = [
    { label: 'Leads', value: leadsEstimate, color: '#94A3B8' },
    { label: 'RDV', value: totals.rdvCount, color: CHART_COLORS.primary },
    { label: 'Offres', value: totals.offres, color: CHART_COLORS.purple },
    { label: 'BC', value: totals.bc, color: CHART_COLORS.success },
  ];

  const maxValue = Math.max(...steps.map(s => s.value), 1);

  wrapper.innerHTML = `
    <div class="chart-funnel">
      ${steps.map((step, i) => {
        const width = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
        return `
          <div class="funnel-step">
            <span class="funnel-label">${step.label}</span>
            <div class="funnel-bar" style="width: ${Math.max(width, 8)}%; background: ${step.color};">
              ${step.value}
            </div>
            ${i < steps.length - 1 ? '<span class="funnel-value">↓</span>' : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderDonutChart(users) {
  const ctx = document.getElementById('chart-donut');
  if (!ctx) return;

  if (chartDonut) chartDonut.destroy();

  const labels = users.map(u => u.nom);
  const caData = users.map(u => u.ca / 1e6);
  const colors = [CHART_COLORS.primary, CHART_COLORS.purple, CHART_COLORS.success, CHART_COLORS.warning];

  chartDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: caData,
        backgroundColor: colors.slice(0, users.length),
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            padding: 16,
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            color: '#64748B',
          },
        },
        tooltip: CHART_DEFAULTS.plugins.tooltip,
      },
    },
  });
}

function renderHorizontalBarChart(users) {
  const ctx = document.getElementById('chart-bar');
  if (!ctx) return;

  if (chartBar) chartBar.destroy();

  const sorted = [...users].sort((a, b) => b.ca - a.ca);
  const labels = sorted.map(u => u.nom);
  const caData = sorted.map(u => u.ca / 1e6);

  chartBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'CA (M)',
        data: caData,
        backgroundColor: [CHART_COLORS.primary, CHART_COLORS.purple, CHART_COLORS.success],
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        title: { display: false },
        legend: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#F1F5F9' },
          ticks: { font: { family: "'Inter', sans-serif", size: 11 }, color: '#94A3B8' },
        },
        y: {
          grid: { display: false },
          ticks: { font: { family: "'Inter', sans-serif", size: 12, weight: '600' }, color: '#0F172A' },
        },
      },
    },
  });
}

export function renderCharts(users, totals) {
  renderAreaChart(users);
  renderFunnelChart(totals);
  renderDonutChart(users);
  renderHorizontalBarChart(users);
}

window.__load_graphs = function () {
  if (window.__chartsData) {
    renderCharts(window.__chartsData.users, window.__chartsData.totals);
  }
};

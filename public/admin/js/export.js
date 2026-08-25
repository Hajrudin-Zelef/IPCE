let dropdownOpen = false;

function toggleDropdown() {
  const dropdown = document.getElementById('export-dropdown');
  if (!dropdown) return;
  dropdownOpen = !dropdownOpen;
  dropdown.classList.toggle('open', dropdownOpen);
}

function closeDropdown() {
  const dropdown = document.getElementById('export-dropdown');
  if (!dropdown) return;
  dropdownOpen = false;
  dropdown.classList.remove('open');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dateSuffix() {
  return new Date().toISOString().split('T')[0];
}

export async function exportExcel() {
  closeDropdown();
  const res = await fetch('/api/admin/export', { credentials: 'include' });
  if (res.status === 401) { window.location.href = '/'; return; }
  const blob = await res.blob();
  downloadBlob(blob, `rapport_ipce_${dateSuffix()}.xlsx`);
}

export async function exportCSV() {
  closeDropdown();
  const res = await fetch('/api/admin/export/csv', { credentials: 'include' });
  if (res.status === 401) { window.location.href = '/'; return; }
  const blob = await res.blob();
  downloadBlob(blob, `rapport_ipce_${dateSuffix()}.csv`);
}

export async function exportPNG() {
  closeDropdown();
  const container = document.querySelector('.content-area');
  if (!container || typeof html2canvas === 'undefined') return;
  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  canvas.toBlob(blob => {
    if (blob) downloadBlob(blob, `pilotage_${dateSuffix()}.png`);
  }, 'image/png');
}

export async function exportPDF() {
  closeDropdown();
  const container = document.querySelector('.content-area');
  if (!container || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const canvas = await html2canvas(container, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/png');
  const pageWidth = 190;
  const imgHeight = (canvas.height * pageWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, pageWidth, imgHeight);
  heightLeft -= 277;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, pageWidth, imgHeight);
    heightLeft -= 277;
  }

  pdf.save(`rapport_ipce_${dateSuffix()}.pdf`);
}

export function initExport() {
  const btn = document.getElementById('export-btn');
  const dropdown = document.getElementById('export-dropdown');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  document.addEventListener('click', (e) => {
    if (dropdown && !dropdown.contains(e.target) && !btn?.contains(e.target)) {
      closeDropdown();
    }
  });

  window.__exportExcel = exportExcel;
  window.__exportCSV = exportCSV;
  window.__exportPNG = exportPNG;
  window.__exportPDF = exportPDF;
}

// sheets.js — GlowAI bottom sheet helpers + history renderer
// Aloha from Pearl City!

function openSheet(id) {
  document.getElementById('sheet-overlay').classList.add('open');
  if (id === 'history-sheet') _renderHistory();
  document.getElementById(id).classList.add('open');
}

function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  if (!document.querySelectorAll('.sheet.open').length) {
    document.getElementById('sheet-overlay').classList.remove('open');
  }
}

function closeAllSheets() {
  document.querySelectorAll('.sheet.open').forEach(s => s.classList.remove('open'));
  document.getElementById('sheet-overlay').classList.remove('open');
}

function _renderHistory() {
  const list = document.getElementById('history-list');
  if (!list) return;
  const scans = glowState.scanHistory;
  if (!scans.length) {
    list.innerHTML = `<div style="color:#aaa;text-align:center;padding:40px 0;font-size:14px;line-height:1.7">No reads yet.<br><span style="font-size:12px;opacity:0.6">Tap Scan My Skin to get started.</span></div>`;
    return;
  }
  list.innerHTML = [...scans].reverse().map((s, i) => {
    const date    = new Date(s.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    const thumb   = s.photo
      ? `<img class="hist-thumb" src="${s.photo}" alt="">`
      : `<div class="hist-placeholder">✨</div>`;
    const realIdx = scans.length - 1 - i;
    return `<div class="hist-item" onclick="glowScan.loadHistory(${realIdx})">
      ${thumb}
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600;color:#111">${s.skinType || 'Skin Scan'}</div>
        <div class="hist-date">${date}</div>
      </div>
      <div class="hist-score">${s.score ?? '—'}</div>
    </div>`;
  }).join('');
}

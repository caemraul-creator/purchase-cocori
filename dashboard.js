// =========================================
// dashboard.js - UPDATE WITH PRINT MENU
// =========================================

// Configuration
const PERMISSIONS = {
  admin: ['dashboard.html', 'index.html', 'approval.html', 'done.html', 'rekap.html', 'rejected.html', 'print.html'],
  viewer: ['dashboard.html', 'index.html', 'print.html'],
  staff_a: ['dashboard.html', 'index.html', 'rekap.html', 'rejected.html', 'print.html'],
  staff_b: ['dashboard.html', 'index.html', 'approval.html', 'done.html', 'rekap.html', 'print.html'],
  staff_c: ['dashboard.html', 'index.html', 'approval.html', 'done.html', 'rekap.html', 'rejected.html', 'print.html']
};

function normalizeRole(role) {
  if (!role) return 'viewer';
  return role.toLowerCase().trim().replace(/ /g, '_');
}

const MENU_DEF = [
  { id: 'request', page: 'index.html', icon: '📋', title: 'New Request', desc: 'Create and submit new purchase requests.' },
  { id: 'approval', page: 'approval.html', icon: '📬', title: 'Approval Hub', desc: 'Central portal to review and approve requests.' },
  { id: 'done', page: 'done.html', icon: '📦', title: 'Fulfillment', desc: 'Track and finalize procurement steps.' },
  { id: 'rekap', page: 'rekap.html', icon: '📊', title: 'Report Center', desc: 'Comprehensive analytics and history.' },
  { id: 'rejected', page: 'rejected.html', icon: '⛔', title: 'Rejection Log', desc: 'Archive of non-fulfillment decisions.' },
  // MENU PRINT DITAMBAHKAN DISINI:
  { id: 'print', page: 'print.html', icon: '📥', title: 'Export & Print', desc: 'Download data purchase request to PDF/Excel.' }
];

// Core Logic
function init() {
  if (!sessionStorage.getItem('isLoggedIn')) {
    window.location.href = 'login.html';
    return;
  }

  setGreeting();
  // renderUserStatus(); // Biarkan ui-helper.js yang menangani ini
  renderWorkMenu();
  if (typeof API_URL !== 'undefined') loadDashboardStatsOptimized();
}

function setGreeting() {
  const gText = document.getElementById('greetingText');
  if (!gText) return; 
  
  const hour = new Date().getHours();
  let msg = 'Halo';

  if (hour < 11) msg = 'Selamat Pagi';
  else if (hour < 15) msg = 'Selamat Siang';
  else if (hour < 19) msg = 'Selamat Sore';
  else msg = 'Selamat Malam';

  const fullName = sessionStorage.getItem('fullName') || sessionStorage.getItem('username') || 'Rekan';
  gText.textContent = `${msg}, ${fullName}`;
}

function renderWorkMenu() {
  const rawRole = sessionStorage.getItem('userRole') || 'viewer';
  const role = normalizeRole(rawRole);
  const allowed = PERMISSIONS[role] || [];
  const container = document.getElementById('menuContainer');
  
  if (!container) return;

  container.innerHTML = MENU_DEF
    .filter(m => allowed.includes(m.page))
    .map(m => `
      <a href="${m.page}" class="menu-item" data-page="${m.page}">
        <div class="menu-item-icon">${m.icon}</div>
        <div class="menu-item-info">
          <h3>${m.title}</h3>
          <p>${m.desc}</p>
        </div>
        <div class="menu-item-arrow">→</div>
      </a>
    `).join('');
}

// =========================================
// OPTIMIZED STATS ENGINE
// =========================================
let statsData = { pending: 0, approved: 0, done: 0, rejected: 0 };
let seenIds = new Set();

function loadDashboardStatsOptimized() {
  statsData = { pending: 0, approved: 0, done: 0, rejected: 0 };
  seenIds.clear();

  if (typeof loadMultipleSheets === 'function') {
      loadMultipleSheets(['', 'done', 'rejected'], (results) => {
        // Main Sheet
        (results[''] || []).forEach(item => processItem(item));
        // Done Sheet
        (results['done'] || []).forEach(item => { if(item.ID) statsData.done++; });
        // Rejected Sheet
        (results['rejected'] || []).forEach(item => { if(item.ID) statsData.rejected++; });

        syncStatsUI();
      });
  }
}

function processItem(item) {
  if (!item.ID || seenIds.has(item.ID)) return;
  const s = (item.Status || '').toLowerCase();
  if (statsData.hasOwnProperty(s)) {
    statsData[s]++;
    seenIds.add(item.ID);
  }
}

function syncStatsUI() {
  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
  };
  setTxt('statPending', statsData.pending);
  setTxt('statApproved', statsData.approved);
  setTxt('statDone', statsData.done);
  setTxt('statRejected', statsData.rejected);
}

document.addEventListener('DOMContentLoaded', init);
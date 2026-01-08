/* ============================
   GLOBAL UI HELPERS - FINAL FIXED
============================ */

// =========================================
// 1. CACHE & OPTIMIZED LOADING SYSTEM
// =========================================
let dataCache = {};
const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 menit
let pendingRequests = {};

function getCachedData(key) {
  const cached = dataCache[key];
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_TIMEOUT) {
    delete dataCache[key];
    return null;
  }
  return cached.data;
}

function setCachedData(key, data) {
  dataCache[key] = { data: data, timestamp: Date.now() };
}

// Global Loading Indicator
document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('globalLoading')) {
    const loader = document.createElement('div');
    loader.id = 'globalLoading';
    loader.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.8);display:none;justify-content:center;align-items:center;z-index:9999;';
    loader.innerHTML = `
      <div style="background:white;padding:20px;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,0.15);display:flex;gap:15px;align-items:center;">
        <div style="width:24px;height:24px;border:3px solid #e5e7eb;border-top:3px solid #2563eb;border-radius:50%;animation:spin 1s linear infinite"></div>
        <span style="font-family:sans-serif;color:#374151;">Memuat data...</span>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;
    document.body.appendChild(loader);
  }
  
  // Init User Floater otomatis
  renderUserStatus();
});

function showLoading(show = true) {
  const loader = document.getElementById('globalLoading');
  if (loader) loader.style.display = show ? 'flex' : 'none';
}

// MAIN LOAD FUNCTION (JSONP + CACHE)
function loadDataOptimized(callback, sheetName = '') {
  const cacheKey = sheetName || 'main';

  // 1. Cek Cache
  const cached = getCachedData(cacheKey);
  if (cached) {
    if (callback) setTimeout(() => callback(cached), 0);
    return;
  }

  // 2. Cek Pending Requests (Deduplication)
  if (pendingRequests[cacheKey]) {
    pendingRequests[cacheKey].push(callback);
    return;
  }
  pendingRequests[cacheKey] = [callback];
  
  showLoading(true);

  // 3. Fetch via JSONP
  const cbName = 'cb_' + cacheKey.replace(/[^a-zA-Z0-9]/g, '') + '_' + Date.now();
  
  window[cbName] = function(data) {
    setCachedData(cacheKey, data);
    
    // Eksekusi semua callback yang menunggu
    const callbacks = pendingRequests[cacheKey] || [];
    delete pendingRequests[cacheKey];
    callbacks.forEach(cb => { if(cb) cb(data); });

    // Cleanup
    delete window[cbName];
    document.getElementById('script-' + cbName)?.remove();
    showLoading(false);
  };

  const script = document.createElement('script');
  script.id = 'script-' + cbName;
  
  try {
    const url = new URL(API_URL); // Pastikan config.js sudah dimuat
    url.searchParams.set('action', 'read');
    url.searchParams.set('sheet', sheetName);
    url.searchParams.set('callback', cbName);
    script.src = url.toString();
  } catch (e) {
    console.error("API_URL Error. Cek config.js");
    showLoading(false);
    return;
  }

  script.onerror = () => {
    console.error("Network Error");
    showLoading(false);
    delete pendingRequests[cacheKey];
  };

  document.body.appendChild(script);
}

// PARALLEL LOADING (Untuk Dashboard)
function loadMultipleSheets(sheets, onAllLoaded) {
  const results = {};
  let loadedCount = 0;
  
  sheets.forEach(sheet => {
    loadDataOptimized((data) => {
      results[sheet] = data;
      loadedCount++;
      if (loadedCount === sheets.length && onAllLoaded) {
        onAllLoaded(results);
      }
    }, sheet);
  });
}

// =========================================
// 2. FORMATTERS (MISSING IN YOUR CODE)
// =========================================
// Fungsi ini WAJIB ada agar app.js tidak error

function formatDate(v) {
  if (!v || v === 'Never Buy') return v || '';
  const d = new Date(v);
  return isNaN(d) ? v : 
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function formatDateTime(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d)) return v;
  return formatDate(v) + ` ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatRupiah(v) {
  if (v === '' || v == null) return '';
  return 'Rp ' + Number(v).toLocaleString('id-ID');
}

function formatNumber(v) {
  if (v === '' || v == null) return '';
  return Number(v).toLocaleString('id-ID');
}

// Global Format Object (Opsional, untuk konsistensi masa depan)
const Format = {
  date: formatDate,
  dateTime: formatDateTime,
  rupiah: formatRupiah,
  number: formatNumber
};

// =========================================
// 3. UI UTILS (LAZY RENDER FIX & TOAST)
// =========================================

// FIXED LAZY RENDER (Menggunakan insertAdjacentHTML agar tag TR tidak double)
function lazyRenderRows(rowsHtmlArray, tbody, batchSize = 50) {
  let index = 0;
  tbody.innerHTML = ''; 

  function nextBatch() {
    if (index >= rowsHtmlArray.length) return;
    
    // Gabungkan string HTML
    const chunk = rowsHtmlArray.slice(index, index + batchSize).join('');
    
    // Masukkan langsung sebagai HTML (bukan text node)
    tbody.insertAdjacentHTML('beforeend', chunk);
    
    index += batchSize;
    if (index < rowsHtmlArray.length) {
      requestAnimationFrame(nextBatch);
    }
  }
  nextBatch();
}

function debounceSearch(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// TOAST NOTIFICATION (MISSING IN YOUR CODE)
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast show'; 
  
  if(type === 'error') t.style.background = '#dc2626';
  else t.style.background = '#16a34a';

  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.style.background = '', 300); 
  }, 3000);
}

// =========================================
// 4. USER SESSION
// =========================================
const userStatusCache = {};

function renderUserStatus() {
  const container = document.getElementById('userFloater');
  if (!container) return;

  const user = sessionStorage.getItem('username') || 'User';
  
  if (!userStatusCache[user]) {
    const rawRole = sessionStorage.getItem('userRole') || 'viewer';
    const role = rawRole.toLowerCase().trim().replace(/ /g, '_');
    const roleName = typeof ROLE_NAMES !== 'undefined' ? (ROLE_NAMES[role] || role) : rawRole;
    userStatusCache[user] = { user, roleName, initial: user.charAt(0).toUpperCase() };
  }
  
  const { initial, roleName } = userStatusCache[user];

  container.innerHTML = `
    <div class="user-avatar">${initial}</div>
    <div class="user-meta">
      <div class="user-id">${user}</div>
      <div class="user-tag">${roleName}</div>
    </div>
    <button class="nav-logout" onclick="performLogout()" title="Logout">⏻</button>
  `;
}

function performLogout() {
  if (confirm('Keluar dari aplikasi?')) {
    sessionStorage.clear();
    window.location.href = 'login.html';
  }
}
// ======================
// CONFIG & STATE
// ======================
const HIDDEN_COLUMNS = [
  'DoneBy', 'DoneDate', 'CreatedAt', 'RejectedBy', 
  'RejectedDate', 'RejectedReason', 'PartOf'
];

const NUMBER_COLUMNS = ['Qty'];
const CURRENCY_COLUMNS = ['Price', 'Nominal'];
const DATE_COLUMNS = ['LastBuyingDate', 'OrderDate'];
const DATETIME_COLUMNS = ['CreatedAt', 'SubmissionDate', 'ApprovedDate', 'DoneDate'];

let allData = [];
let filteredData = [];
let headers = [];
let currentPage = 1;
let pageSize = 25;
let editMode = false;
let currentEditId = null;

// ======================
// LOAD DATA
// ======================
function loadData() {
  // Menggunakan loadDataOptimized dari ui-helper.js
  loadDataOptimized((data) => {
    allData = data || [];
    filteredData = [...allData];

    // Ambil header dari baris pertama data
    headers = Object.keys(allData[0] || {}).filter(h => !HIDDEN_COLUMNS.includes(h));

    currentPage = 1;
    renderTable();
    renderPagination();
  }); // Kosong = sheet default/main
}

// ======================
// SEARCH & PAGE
// ======================
function onSearch(e) {
  const q = e.target.value.toLowerCase();
  currentPage = 1;
  filteredData = allData.filter(r =>
    headers.map(h => r[h]).join(' ').toLowerCase().includes(q)
  );
  renderTable();
  renderPagination();
}

function getPagedData() {
  const start = (currentPage - 1) * pageSize;
  return filteredData.slice(start, start + pageSize);
}

function renderPagination() {
  const container = document.getElementById('pagination');
  const info = document.getElementById('infoText');
  if (!container || !info) return;

  const total = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  container.innerHTML = '';
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, total);
  info.textContent = `Menampilkan ${start}–${end} dari ${total} data`;

  for (let i = 1; i <= totalPages; i++) {
    const b = document.createElement('button');
    b.textContent = i;
    b.className = 'pagination-btn';
    if (i === currentPage) b.classList.add('active');
    b.onclick = () => { currentPage = i; renderTable(); renderPagination(); };
    container.appendChild(b);
  }
}

// ======================
// RENDER TABLE
// ======================
function renderTable() {
  const thead = document.querySelector('thead');
  const tbody = document.querySelector('tbody');
  if (!thead || !tbody) return;

  // Header
  const headerHtml = headers.map(h => {
    let html = `<th>${h}</th>`;
    if (h === 'ID') html += '<th>Aksi</th>';
    return html;
  }).join('');
  thead.innerHTML = `<tr>${headerHtml}</tr>`;

  const pageData = getPagedData();
  if (!pageData.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length + 1}" class="text-center">Data tidak ditemukan</td></tr>`;
    return;
  }

  // Rows
  const rowsHtml = pageData.map(row => {
    let cellsHtml = headers.map(h => {
      let v = row[h] ?? '';
      let cls = '';

      // Menggunakan Format Global dari ui-helper.js
      if (DATETIME_COLUMNS.includes(h)) { v = formatDateTime(v); cls = 'text-center'; }
      else if (DATE_COLUMNS.includes(h)) { v = formatDate(v); cls = 'text-center'; }
      
      if (NUMBER_COLUMNS.includes(h)) { v = formatNumber(v); cls = 'text-right'; }
      if (CURRENCY_COLUMNS.includes(h)) { v = formatRupiah(v); cls = 'text-right'; }
      
      if (h === 'Items' || h === 'Description') cls += ' truncate';

      let cell = `<td class="${cls}" title="${v}">${v}</td>`;

      if (h === 'Status') {
        cell = `<td class="text-center"><span class="status ${String(v).toLowerCase()}">${v}</span></td>`;
      }

      if (h === 'ID') {
        cell += `<td class="text-center">
          <button class="btn-secondary" onclick="openEdit('${row.ID}')" title="Edit">✏️</button>
        </td>`;
      }
      return cell;
    }).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  // Menggunakan lazyRenderRows dari ui-helper.js
  lazyRenderRows(rowsHtml, tbody, 50);
}

// ======================
// EDIT & FORM HANDLING
// ======================
function openEdit(id) {
  const row = allData.find(r => r.ID === id);
  if (!row) return alert('Data tidak ditemukan');

  editMode = true;
  currentEditId = id;

  document.getElementById('formID').value = row.ID;
  ['Department', 'Office', 'Items', 'PartOf', 'Description', 'Qty', 'Unit', 'Price', 'Priority', 'OrderBy'].forEach(name => {
    const el = document.querySelector(`[name="${name}"]`);
    if(el) el.value = row[name] || '';
  });

  // Handle LastBuyingDate Fallback (Logika spesifik form)
  if (typeof handleLastBuyingDateFallback === 'function') {
    handleLastBuyingDateFallback(row.LastBuyingDate || '');
  }

  // Handle OrderDate
  document.querySelector('[name="OrderDate"]').value = parseDateForInput(row.OrderDate);
  document.getElementById('modal').classList.add('show');
}

// Helper khusus form (Tetap disimpan disini karena spesifik input form)
function parseDateForInput(dateValue) {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) return dateValue;
  
  const d = new Date(dateValue);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return '';
}

// ======================
// INIT
// ======================
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Search dengan Debounce dari ui-helper.js
  document.getElementById('search')?.addEventListener('input', debounceSearch(onSearch, 300));
  
  document.getElementById('pageSize')?.addEventListener('change', (e) => {
    pageSize = Number(e.target.value);
    currentPage = 1;
    renderTable();
    renderPagination();
  });

  // Modal handlers
  const modal = document.getElementById('modal');
  const form = document.getElementById('prForm');
  
  document.getElementById('btnAdd').addEventListener('click', () => {
    editMode = false;
    currentEditId = null;
    form.reset();
    document.getElementById('formID').value = '';
    // Reset date logic if exists
    if(document.getElementById('lastBuyingOption')) {
       document.getElementById('lastBuyingOption').value = 'date';
       document.getElementById('lastBuyingDate').disabled = false;
    }
    modal.classList.add('show');
  });

  document.getElementById('btnClose').addEventListener('click', () => modal.classList.remove('show'));
  document.getElementById('btnCancel').addEventListener('click', () => modal.classList.remove('show'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    if (editMode) fd.append('ID', currentEditId);
    
    // Ambil username dari auth/session
    fd.append('Requester', sessionStorage.getItem('username') || 'User');

    try {
      showToast('Menyimpan data...', 'success'); // dari ui-helper.js
      await fetch(API_URL, { method: 'POST', body: fd });
      showToast('Data berhasil disimpan!', 'success');
      modal.classList.remove('show');
      
      // Clear cache ui-helper agar data baru muncul
      if(window.dataCache) delete window.dataCache['main'];
      
      setTimeout(loadData, 500);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });
});
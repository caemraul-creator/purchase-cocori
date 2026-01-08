// ======================
// CONFIG & STATE
// ======================
const APPROVAL_HIDDEN_COLUMNS = [
  'CreatedAt', 'ApprovedBy', 'ApprovedDate', 'DoneBy', 
  'DoneDate', 'RejectedBy', 'RejectedDate', 'RejectedReason'
];
const NUMBER_COLUMNS = ['Qty'];
const CURRENCY_COLUMNS = ['Price', 'Nominal'];
const DATE_COLUMNS = ['LastBuyingDate', 'OrderDate'];
const DATETIME_COLUMNS = ['SubmissionDate', 'ApprovedDate', 'CreatedAt'];

let allData = [];
let filteredData = [];
let headers = [];
let currentPage = 1;
let pageSize = 15;

// ======================
// LOAD DATA
// ======================
function loadData() {
  loadDataOptimized((data) => {
    // Filter hanya status PENDING
    allData = (data || []).filter(d => d.Status === 'pending');
    filteredData = [...allData];

    headers = Object.keys(allData[0] || {}).filter(h => !APPROVAL_HIDDEN_COLUMNS.includes(h));

    currentPage = 1;
    renderTable();
    renderPagination();
  });
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
  info.textContent = `Menampilkan ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, total)} dari ${total}`;

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

  const rowsHtml = pageData.map(r => {
    let cellsHtml = headers.map(h => {
      let v = r[h] ?? '';
      let cls = '';

      // Pakai formatter ui-helper.js
      if (DATETIME_COLUMNS.includes(h)) { v = formatDateTime(v); cls = 'text-center'; }
      else if (DATE_COLUMNS.includes(h)) { v = formatDate(v); cls = 'text-center'; }
      if (NUMBER_COLUMNS.includes(h)) { v = formatNumber(v); cls = 'text-right'; }
      if (CURRENCY_COLUMNS.includes(h)) { v = formatRupiah(v); cls = 'text-right'; }

      let cell = `<td class="${cls}">${v}</td>`;
      if (h === 'Status') cell = `<td class="text-center"><span class="status pending">pending</span></td>`;

      if (h === 'ID') {
        cell += `<td class="text-center" style="white-space:nowrap;">
          <button class="btn-primary" onclick="approve('${r.ID}')" title="Approve">✅</button>
          <button class="btn-secondary" onclick="reject('${r.ID}')" title="Reject">❌</button>
        </td>`;
      }
      return cell;
    }).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  lazyRenderRows(rowsHtml, tbody, 50);
}

// ======================
// ACTIONS
// ======================
async function approve(id) {
  const name = sessionStorage.getItem('username') || prompt('Masukkan nama approver:');
  if (!name) return;

  const fd = new FormData();
  fd.append('ID', id);
  fd.append('Status', 'approved');
  fd.append('ApprovedBy', name);
  await submit(fd);
}

async function reject(id) {
  const name = sessionStorage.getItem('username') || prompt('Masukkan nama penolak:');
  const reason = prompt('Masukkan alasan reject:');
  if (!name || !reason) return;

  const fd = new FormData();
  fd.append('ID', id);
  fd.append('Status', 'rejected');
  fd.append('RejectedBy', name);
  fd.append('RejectedReason', reason);
  await submit(fd);
}

async function submit(fd) {
  try {
    showToast('Memproses...');
    const res = await fetch(API_URL, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Gagal update');
    
    showToast('Status berhasil diperbarui');
    if(window.dataCache) delete window.dataCache['main'];
    setTimeout(loadData, 500);
  } catch (err) {
    showToast('Gagal: ' + err.message, 'error');
  }
}

// ======================
// INIT
// ======================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  document.getElementById('search')?.addEventListener('input', debounceSearch(onSearch, 300));
  document.getElementById('pageSize')?.addEventListener('change', (e) => {
    pageSize = Number(e.target.value);
    currentPage = 1;
    renderTable();
    renderPagination();
  });
});
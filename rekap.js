// ======================
// CONFIG & STATE
// ======================
const REKAP_HIDDEN_COLUMNS = ['CreatedAt', 'ApprovedBy', 'ApprovedDate', 'DoneBy', 'DoneDate'];
const NUMBER_COLUMNS = ['Qty'];
const CURRENCY_COLUMNS = ['Price', 'Nominal'];
const DATE_COLUMNS = ['SubmissionDate', 'LastBuyingDate', 'OrderDate'];
const DATETIME_COLUMNS = ['CreatedAt', 'ApprovedDate', 'DoneDate'];

let allData = [];
let filteredData = [];
let headers = [];
let currentPage = 1;
let pageSize = 20;

// ======================
// LOAD DATA
// ======================
function loadData() {
  // Load dari sheet 'done'
  loadDataOptimized((data) => {
    allData = data || [];
    filteredData = [...allData];
    headers = Object.keys(allData[0] || {}).filter(h => !REKAP_HIDDEN_COLUMNS.includes(h));

    currentPage = 1;
    renderTable();
    renderPagination();
  }, 'done');
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

  const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
  thead.innerHTML = `<tr>${headerHtml}</tr>`;

  const pageData = getPagedData();
  if (!pageData.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length}" class="text-center">Data tidak ditemukan</td></tr>`;
    return;
  }

  const rowsHtml = pageData.map(r => {
    let cellsHtml = headers.map(h => {
      let v = r[h] ?? '';
      let cls = '';

      if (DATETIME_COLUMNS.includes(h)) { v = formatDateTime(v); cls = 'text-center'; }
      else if (DATE_COLUMNS.includes(h)) { v = formatDate(v); cls = 'text-center'; }
      if (NUMBER_COLUMNS.includes(h)) { v = formatNumber(v); cls = 'text-right'; }
      if (CURRENCY_COLUMNS.includes(h)) { v = formatRupiah(v); cls = 'text-right'; }

      let cell = `<td class="${cls}">${v}</td>`;
      if (h === 'Status') cell = `<td class="text-center"><span class="status done">done</span></td>`;
      return cell;
    }).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  lazyRenderRows(rowsHtml, tbody, 50);
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
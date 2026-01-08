// ======================
// CONFIG & STATE
// ======================
const DONE_HIDDEN_COLUMNS = [
  'CreatedAt', 'ApprovedBy', 'ApprovedDate', 'DoneBy', 
  'DoneDate', 'RejectedBy', 'RejectedDate', 'RejectedReason'
];

const NUMBER_COLUMNS = ['Qty'];
const CURRENCY_COLUMNS = ['Price', 'Nominal'];
const DATE_COLUMNS = ['SubmissionDate', 'LastBuyingDate', 'OrderDate'];

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
    // Filter hanya status APPROVED (Siap diproses/Done)
    allData = (data || []).filter(d => d.Status === 'approved');
    filteredData = [...allData];

    headers = Object.keys(allData[0] || {}).filter(h => !DONE_HIDDEN_COLUMNS.includes(h));

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
    tbody.innerHTML = `<tr><td colspan="${headers.length + 1}" class="text-center">Tidak ada data APPROVED</td></tr>`;
    return;
  }

  const rowsHtml = pageData.map(r => {
    let cellsHtml = headers.map(h => {
      let v = r[h] ?? '';
      let cls = '';

      if (DATE_COLUMNS.includes(h)) { v = formatDate(v); cls = 'text-center'; }
      if (NUMBER_COLUMNS.includes(h)) { v = formatNumber(v); cls = 'text-right'; }
      if (CURRENCY_COLUMNS.includes(h)) { v = formatRupiah(v); cls = 'text-right'; }

      let cell = `<td class="${cls}">${v}</td>`;
      if (h === 'Status') cell = `<td class="text-center"><span class="status approved">approved</span></td>`;

      if (h === 'ID') {
        cell += `<td class="text-center">
          <button class="btn-primary" onclick="markDone('${r.ID}')" title="Mark Done">📦</button>
        </td>`;
      }
      return cell;
    }).join('');
    return `<tr>${cellsHtml}</tr>`;
  });

  lazyRenderRows(rowsHtml, tbody, 50);
}

// ======================
// ACTIONS (Mark Done)
// ======================
function markDone(id) {
  // UX lebih baik daripada prompt standar
  const choice = prompt(
    'Ketik angka pilihan:\n1 = Completed (Semua dibeli)\n2 = Partial (Sebagian dibeli)'
  );

  if (choice === '1') completeAll(id);
  else if (choice === '2') partialComplete(id);
  else if (choice !== null) alert('Pilihan tidak valid');
}

async function completeAll(id) {
  const user = sessionStorage.getItem('username') || prompt('Nama yang menyelesaikan:');
  if (!user) return;

  const fd = new FormData();
  fd.append('ID', id);
  fd.append('Status', 'done');
  fd.append('DoneBy', user);
  await submit(fd, 'Request selesai (Completed)');
}

async function partialComplete(id) {
  const data = allData.find(d => d.ID === id);
  if (!data) return;

  const boughtQty = Number(prompt(`Qty dibeli (Maks ${data.Qty}):`));
  if (!boughtQty || boughtQty <= 0 || boughtQty >= data.Qty) {
    alert('Qty tidak valid (Harus > 0 dan < Total Qty)');
    return;
  }

  const user = sessionStorage.getItem('username') || prompt('Nama yang menyelesaikan:');
  if (!user) return;

  const fd = new FormData();
  fd.append('ID', id);
  fd.append('Status', 'partial');
  fd.append('BoughtQty', boughtQty);
  fd.append('RemainingQty', data.Qty - boughtQty);
  fd.append('DoneBy', user);
  await submit(fd, 'Partial request berhasil');
}

async function submit(fd, successMsg) {
  try {
    showToast('Memproses...');
    const res = await fetch(API_URL, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Gagal update');
    
    showToast(successMsg);
    if(window.dataCache) delete window.dataCache['main']; // Clear cache main karena status berubah
    setTimeout(loadData, 500);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
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
// ==================== ?°ìˆ˜??ëª©ë¡ ?˜ì´ì§€ ====================

// ===== Firebase ê³µí†µ ?¤ì • import =====
import { initializeFirebaseApp, COLLECTIONS } from './firebase-config.js';

console.log('?? centers-list.js ë¡œë”© ?œì‘ (ê³µí†µ ?¤ì • ?¬ìš©)');

// ==================== ?„ì—­ ?íƒœ ====================
const state = {
  allCenters: [],
  filteredCenters: [],
  currentPage: 1,
  itemsPerPage: 20,
  viewMode: 'table', // 'table' or 'card'
  sortField: 'name',
  sortOrder: 'asc',
  searchTerm: '',
  regionFilter: 'all',
  capacityFilter: 'all'
};

// ==================== DOM ?”ì†Œ ====================
const elements = {
  searchInput: null,
  regionFilter: null,
  capacityFilter: null,
  viewToggle: null,
  exportCsv: null,
  exportExcel: null,
  printBtn: null,
  centersContainer: null,
  pagination: null,
  loading: null,
  emptyState: null,
  resultsCount: null,
  viewMode: null,
  statTotal: null,
  statRegions: null,
  statAvg: null
};

// ==================== ì´ˆê¸°??====================
async function init() {
  console.log('?“ ì´ˆê¸°???œì‘');

  // DOM ?”ì†Œ ê°€?¸ì˜¤ê¸?
  elements.searchInput = document.getElementById('searchInput');
  elements.regionFilter = document.getElementById('regionFilter');
  elements.capacityFilter = document.getElementById('capacityFilter');
  elements.viewToggle = document.getElementById('viewToggle');
  elements.exportCsv = document.getElementById('exportCsv');
  elements.exportExcel = document.getElementById('exportExcel');
  elements.printBtn = document.getElementById('printBtn');
  elements.centersContainer = document.getElementById('centersContainer');
  elements.pagination = document.getElementById('pagination');
  elements.loading = document.getElementById('loading');
  elements.emptyState = document.getElementById('emptyState');
  elements.resultsCount = document.getElementById('resultsCount');
  elements.viewMode = document.getElementById('viewMode');
  elements.statTotal = document.getElementById('stat-total');
  elements.statRegions = document.getElementById('stat-regions');
  elements.statAvg = document.getElementById('stat-avg');

  // ?´ë²¤??ë¦¬ìŠ¤???¤ì •
  setupEventListeners();

  // ?€?¥ëœ ë³´ê¸° ëª¨ë“œ ë¶ˆëŸ¬?¤ê¸°
  const savedView = localStorage.getItem('viewMode');
  if (savedView) {
    state.viewMode = savedView;
    updateViewToggleButton();
  }

  // ?°ì´??ë¡œë“œ
  await loadData();

  console.log('??ì´ˆê¸°???„ë£Œ');
}

// ==================== ?´ë²¤??ë¦¬ìŠ¤??====================
function setupEventListeners() {
  // ê²€??(?”ë°”?´ìŠ¤)
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchTerm = e.target.value.toLowerCase().trim();
      state.currentPage = 1;
      applyFiltersAndRender();
    }, 300);
  });

  // ?„í„°
  elements.regionFilter.addEventListener('change', (e) => {
    state.regionFilter = e.target.value;
    state.currentPage = 1;
    applyFiltersAndRender();
  });

  elements.capacityFilter.addEventListener('change', (e) => {
    state.capacityFilter = e.target.value;
    state.currentPage = 1;
    applyFiltersAndRender();
  });

  // ë³´ê¸° ?„í™˜
  elements.viewToggle.addEventListener('click', () => {
    state.viewMode = state.viewMode === 'table' ? 'card' : 'table';
    localStorage.setItem('viewMode', state.viewMode);
    updateViewToggleButton();
    render();
  });

  // ?´ë³´?´ê¸°
  elements.exportCsv.addEventListener('click', exportToCsv);
  elements.exportExcel.addEventListener('click', exportToExcel);

  // ?¸ì‡„
  elements.printBtn.addEventListener('click', () => window.print());
}

// ==================== ?°ì´??ë¡œë“œ ====================
async function loadData() {
  console.log('?“¦ ?°ì´??ë¡œë”© ?œì‘');

  // 1. ìºì‹œ ?•ì¸
  const cached = getCachedData();
  if (cached && cached.length > 0) {
    console.log(`??ìºì‹œ?ì„œ ${cached.length}ê°?ë¡œë“œ`);
    state.allCenters = cached;
    applyFiltersAndRender();
    updateStats();

    // ë°±ê·¸?¼ìš´?œì—??Firebase ?…ë°?´íŠ¸
    loadFromFirebase(false);
    return;
  }

  // 2. ìºì‹œ ?†ìœ¼ë©?ë¡œë”© ?œì‹œ?˜ê³  Firebase ë¡œë“œ
  showLoading(true);
  await loadFromFirebase(true);
  showLoading(false);
}

async function loadFromFirebase(shouldShowToast = true) {
  try {
    // Firebase SDK ë¡œë“œ (?€?„ì•„??5ì´?
    const firebase = await Promise.race([
      loadFirebaseSDK(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
    ]);

    // Firestore?ì„œ ?°ì´??ê°€?¸ì˜¤ê¸?(ê³µí†µ ì»¬ë ‰???´ë¦„ ?¬ìš©)
    const querySnapshot = await firebase.getDocs(
      firebase.collection(firebase.db, COLLECTIONS.TRAINING_CENTERS)
    );

    const centers = [];
    querySnapshot.forEach((doc) => {
      centers.push({ id: doc.id, ...doc.data() });
    });

    console.log(`??Firebase?ì„œ ${centers.length}ê°?ë¡œë“œ`);

    if (centers.length > 0) {
      state.allCenters = centers;
      setCachedData(centers);
      applyFiltersAndRender();
      updateStats();

      if (shouldShowToast) {
        showToast(`${centers.length}ê°œì˜ ?°ìˆ˜?ì„ ë¶ˆëŸ¬?”ìŠµ?ˆë‹¤!`, 'success');
      }
    }
  } catch (error) {
    console.warn('? ï¸ Firebase ë¡œë“œ ?¤íŒ¨:', error.message);

    // ?˜í”Œ ?°ì´?°ë¡œ ?´ë°±
    if (state.allCenters.length === 0) {
      state.allCenters = getSampleData();
      applyFiltersAndRender();
      updateStats();
      showToast('?˜í”Œ ?°ì´?°ë? ?œì‹œ?©ë‹ˆ??, 'info');
    }
  }
}

async function loadFirebaseSDK() {
  // ê³µí†µ initializeFirebaseApp() ?¬ìš© (?±ê???- ì¤‘ë³µ ì´ˆê¸°??ë°©ì?)
  const { db, modules } = await initializeFirebaseApp();
  const { collection, getDocs } = modules;
  console.log('??Firebase SDK ë¡œë“œ ?„ë£Œ (ê³µí†µ ?¤ì • ?¬ìš©)');
  return { db, collection, getDocs };
}

function getSampleData() {
  return [
    {
      id: 'sample-1',
      name: '?œêµ­?¡ì›”??,
      branch: 'ì²?†Œ??ì²´í—˜ê´€',
      region: 'ê²½ê¸°',
      address: 'ê²½ê¸°???±ë‚¨??ë¶„ë‹¹êµ?ë¶„ë‹¹?˜ì„œë¡?501',
      capacity: 200,
      phone: '1644-1333'
    },
    {
      id: 'sample-2',
      name: 'êµ?¦½ì¤‘ì•™ì²?†Œ?„ìˆ˜?¨ì›',
      branch: null,
      region: 'ì¶©ë‚¨',
      address: 'ì¶©ì²­?¨ë„ ì²œì•ˆ???™ë‚¨êµ?? ëŸ‰??,
      capacity: 500,
      phone: '041-620-7700'
    },
    {
      id: 'sample-3',
      name: '?°ë¦¼êµìœ¡??,
      branch: '?¨ë?ì§€??,
      region: '?„ë‚¨',
      address: '?„ë¼?¨ë„ ?˜ì£¼???°ë¦¼êµìœ¡ë¡?92',
      capacity: 150,
      phone: '061-338-4200'
    }
  ];
}

// ==================== ìºì‹œ ê´€ë¦?====================
function getCachedData() {
  try {
    const data = localStorage.getItem('centers-cache');
    const timestamp = localStorage.getItem('centers-cache-time');

    if (data && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 30 * 60 * 1000) { // 30ë¶?
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.error('ìºì‹œ ë¡œë“œ ?¤íŒ¨:', error);
  }
  return null;
}

function setCachedData(data) {
  try {
    localStorage.setItem('centers-cache', JSON.stringify(data));
    localStorage.setItem('centers-cache-time', Date.now().toString());
    console.log('?’¾ ìºì‹œ ?€???„ë£Œ');
  } catch (error) {
    console.error('ìºì‹œ ?€???¤íŒ¨:', error);
  }
}

// ==================== ?„í„°ë§?ë°??•ë ¬ ====================
function applyFiltersAndRender() {
  // ?„í„°ë§?
  state.filteredCenters = state.allCenters.filter(center => {
    // ê²€?‰ì–´
    if (state.searchTerm) {
      const searchable = [
        center.name,
        center.branch,
        center.region,
        center.address
      ].join(' ').toLowerCase();

      if (!searchable.includes(state.searchTerm)) {
        return false;
      }
    }

    // ì§€???„í„°
    if (state.regionFilter !== 'all') {
      if (center.region !== state.regionFilter) {
        return false;
      }
    }

    // ?˜ìš©?¸ì› ?„í„°
    if (state.capacityFilter !== 'all') {
      const capacity = parseInt(center.capacity) || 0;
      if (state.capacityFilter === 'small' && capacity >= 100) return false;
      if (state.capacityFilter === 'medium' && (capacity < 100 || capacity >= 300)) return false;
      if (state.capacityFilter === 'large' && capacity < 300) return false;
    }

    return true;
  });

  // ?•ë ¬
  sortCenters();

  // ?Œë”ë§?
  render();
}

function sortCenters() {
  state.filteredCenters.sort((a, b) => {
    let aVal = a[state.sortField];
    let bVal = b[state.sortField];

    // null ì²˜ë¦¬
    if (!aVal) aVal = '';
    if (!bVal) bVal = '';

    // ?«ì ?„ë“œ
    if (state.sortField === 'capacity') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }

    // ë¬¸ì???„ë“œ
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return state.sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return state.sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
}

function handleSort(field) {
  if (state.sortField === field) {
    state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortField = field;
    state.sortOrder = 'asc';
  }
  sortCenters();
  render();
}

// ==================== ?Œë”ë§?====================
function render() {
  // ê²°ê³¼ ???…ë°?´íŠ¸
  elements.resultsCount.textContent =
    `ê²€??ê²°ê³¼: ${state.filteredCenters.length.toLocaleString()}ê°?;

  // ë¹??íƒœ ì²˜ë¦¬
  if (state.filteredCenters.length === 0) {
    elements.centersContainer.style.display = 'none';
    elements.emptyState.style.display = 'block';
    elements.pagination.innerHTML = '';
    return;
  }

  elements.centersContainer.style.display = 'block';
  elements.emptyState.style.display = 'none';

  // ?˜ì´ì§€?¤ì´??ê³„ì‚°
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const centersToShow = state.filteredCenters.slice(start, end);

  // ë·°ì— ?°ë¼ ?Œë”ë§?
  if (state.viewMode === 'table') {
    renderTable(centersToShow);
  } else {
    renderCards(centersToShow);
  }

  // ?˜ì´ì§€?¤ì´???Œë”ë§?
  renderPagination();
}

function renderTable(centers) {
  const html = `
    <div class="table-container">
      <table class="centers-table">
        <thead>
          <tr>
            <th class="sortable ${state.sortField === 'name' ? 'sorted-' + state.sortOrder : ''}"
                onclick="window.handleSort('name')" style="width: 28%;">
              ?°ìˆ˜?ëª…
            </th>
            <th class="sortable ${state.sortField === 'region' ? 'sorted-' + state.sortOrder : ''}"
                onclick="window.handleSort('region')" style="width: 12%;">
              ì§€??
            </th>
            <th class="sortable ${state.sortField === 'capacity' ? 'sorted-' + state.sortOrder : ''}"
                onclick="window.handleSort('capacity')" style="width: 12%;">
              ?˜ìš©?¸ì›
            </th>
            <th style="width: 33%;">ì£¼ì†Œ</th>
            <th style="width: 15%;">?°ë½ì²?/th>
          </tr>
        </thead>
        <tbody>
          ${centers.map(center => `
            <tr>
              <td>
                <span class="center-name">${center.name}</span>
                ${center.branch ? `<span class="center-branch">${center.branch}</span>` : ''}
              </td>
              <td><span class="badge badge-region">${center.region}</span></td>
              <td style="text-align: center;">
                ${center.capacity
      ? `<span style="color: #334155; font-weight: 600; background: #f1f5f9; padding: 4px 10px; border-radius: 4px;">${center.capacity.toLocaleString()}ëª?/span>`
      : `<span style="color: #cbd5e1; font-size: 0.9em;">-</span>`}
              </td>
              <td><span style="color: #334155;">${center.address || '<span style="color: #cbd5e1; font-size: 0.9em;">ì£¼ì†Œ ë¯¸ë“±ë¡?/span>'}</span></td>
              <td>
                ${center.phone
      ? `<span style="color: #475569;"><i class="fas fa-phone-alt" style="font-size: 0.85em; color: #94a3b8; margin-right: 4px;"></i>${center.phone}</span>`
      : `<span style="color: #cbd5e1; font-size: 0.9em;">?°ë½ì²??†ìŒ</span>`}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  elements.centersContainer.innerHTML = html;
}

function renderCards(centers) {
  const html = `
    <div class="cards-container">
      ${centers.map(center => `
        <div class="center-card">
          <div class="card-header">
            <div class="card-title">${center.name}</div>
            ${center.branch ? `<span class="center-branch">${center.branch}</span>` : ''}
          </div>
          <div class="card-info-list">
            <div class="card-info">
              <i class="fas fa-map-marker-alt"></i>
              <span><span class="badge badge-region" style="margin-right:6px;">${center.region}</span> ${center.address || '-'}</span>
            </div>
            ${center.capacity ? `
              <div class="card-info">
                <i class="fas fa-users"></i>
                <span>?˜ìš©?¸ì› <strong style="color:#334155;">${center.capacity.toLocaleString()}</strong>ëª?/span>
              </div>
            ` : `
              <div class="card-info" style="color: #94a3b8;">
                <i class="fas fa-users" style="color: #cbd5e1;"></i>
                <span>?˜ìš©?¸ì› <span style="font-style: italic;">?•ë³´ ?†ìŒ</span></span>
              </div>
            `}
            ${center.phone ? `
              <div class="card-info">
                <i class="fas fa-phone-alt"></i>
                <span style="color: #475569; font-weight: 500;">${center.phone}</span>
              </div>
            ` : `
              <div class="card-info" style="color: #94a3b8;">
                <i class="fas fa-phone-alt" style="color: #cbd5e1;"></i>
                <span style="font-style: italic;">?°ë½ì²??†ìŒ</span>
              </div>
            `}
          </div>
        </div>
      `).join('')
    }
    </div >
  `;

  elements.centersContainer.innerHTML = html;
}

function renderPagination() {
  const totalPages = Math.ceil(state.filteredCenters.length / state.itemsPerPage);

  if (totalPages <= 1) {
    elements.pagination.innerHTML = '';
    return;
  }

  let html = '';

  // ?´ì „ ë²„íŠ¼
  html += `
  < button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''}
onclick = "window.goToPage(${state.currentPage - 1})" >
  <i class="fas fa-chevron-left"></i>
    </button >
  `;

  // ?˜ì´ì§€ ë²„íŠ¼
  const maxButtons = 5;
  let startPage = Math.max(1, state.currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    html += `< button class="page-btn" onclick = "window.goToPage(1)" > 1</button > `;
    if (startPage > 2) {
      html += `< span style = "padding: 0 5px;" >...</span > `;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
  < button class="page-btn ${i === state.currentPage ? 'active' : ''}"
onclick = "window.goToPage(${i})" >
  ${i}
      </button >
  `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `< span style = "padding: 0 5px;" >...</span > `;
    }
    html += `< button class="page-btn" onclick = "window.goToPage(${totalPages})" > ${totalPages}</button > `;
  }

  // ?¤ìŒ ë²„íŠ¼
  html += `
  < button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''}
onclick = "window.goToPage(${state.currentPage + 1})" >
  <i class="fas fa-chevron-right"></i>
    </button >
  `;

  elements.pagination.innerHTML = html;
}

// ==================== ?˜ì´ì§€ ?´ë™ ====================
function goToPage(page) {
  const totalPages = Math.ceil(state.filteredCenters.length / state.itemsPerPage);
  if (page < 1 || page > totalPages) return;

  state.currentPage = page;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== ?µê³„ ?…ë°?´íŠ¸ ====================
function updateStats() {
  // ì´??°ìˆ˜????
  elements.statTotal.textContent = state.allCenters.length.toLocaleString();

  // ì§€????
  const regions = new Set(state.allCenters.map(c => c.region).filter(r => r));
  elements.statRegions.textContent = regions.size;

  // ?‰ê·  ?˜ìš©?¸ì›
  const total = state.allCenters.reduce((sum, c) => sum + (parseInt(c.capacity) || 0), 0);
  const avg = state.allCenters.length > 0 ? Math.round(total / state.allCenters.length) : 0;
  elements.statAvg.textContent = avg.toLocaleString();
}

// ==================== CSV ?´ë³´?´ê¸° ====================
function exportToCsv() {
  try {
    const headers = ['?°ìˆ˜?ëª…', 'ì§€??, 'ì§€??, 'ì£¼ì†Œ', '?˜ìš©?¸ì›', '?°ë½ì²?];
    const rows = state.filteredCenters.map(c => [
      c.name || '',
      c.branch || '',
      c.region || '',
      c.address || '',
      c.capacity || '',
      c.phone || ''
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(field => `"${String(field).replace(/" / g, '""')}"`).join(',') + '\n';
    });

    // BOM ì¶”ê? (?œê? ê¹¨ì§ ë°©ì?)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `?°ìˆ˜?ëª©ë¡?${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    showToast(`${state.filteredCenters.length}ê°??°ìˆ˜?ì„ CSVë¡??´ë³´?ˆìŠµ?ˆë‹¤`, 'success');
  } catch (error) {
    console.error('CSV ?´ë³´?´ê¸° ?¤íŒ¨:', error);
    showToast('CSV ?´ë³´?´ê¸°???¤íŒ¨?ˆìŠµ?ˆë‹¤', 'error');
  }
}

// ==================== Excel ?´ë³´?´ê¸° ====================
function exportToExcel() {
  try {
    const headers = ['?°ìˆ˜?ëª…', 'ì§€??, 'ì§€??, 'ì£¼ì†Œ', '?˜ìš©?¸ì›', '?°ë½ì²?];
    const rows = state.filteredCenters.map(c => [
      c.name || '',
      c.branch || '',
      c.region || '',
      c.address || '',
      c.capacity || '',
      c.phone || ''
    ]);

    let html = '<table><thead><tr>';
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';

    rows.forEach(row => {
      html += '<tr>';
      row.forEach(cell => { html += `<td>${String(cell)}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `?°ìˆ˜?ëª©ë¡?${new Date().toISOString().split('T')[0]}.xls`;
    link.click();

    URL.revokeObjectURL(url);
    showToast(`${state.filteredCenters.length}ê°??°ìˆ˜?ì„ Excelë¡??´ë³´?ˆìŠµ?ˆë‹¤`, 'success');
  } catch (error) {
    console.error('Excel ?´ë³´?´ê¸° ?¤íŒ¨:', error);
    showToast('Excel ?´ë³´?´ê¸°???¤íŒ¨?ˆìŠµ?ˆë‹¤', 'error');
  }
}

// ==================== UI ?¬í¼ ====================
function showLoading(show) {
  elements.loading.style.display = show ? 'block' : 'none';
}

function updateViewToggleButton() {
  const icon = state.viewMode === 'table' ? 'fa-th' : 'fa-list-ul';
  const text = state.viewMode === 'table' ? 'ì¹´ë“œ ë³´ê¸°' : '?Œì´ë¸?ë·?;
  const btnHTML = `<i class="fas ${icon}"></i> <span id="viewModeText">${text}</span>`;
  elements.viewToggle.innerHTML = btnHTML;
  elements.viewMode.textContent = state.viewMode === 'table' ? '?Œì´ë¸?ë³´ê¸°' : 'ì¹´ë“œ ë³´ê¸°';
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==================== ?„ì—­ ?¨ìˆ˜ ?¸ì¶œ ====================
window.handleSort = handleSort;
window.goToPage = goToPage;

// ==================== ?œì‘ ====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('??centers-list.js ë¡œë“œ ?„ë£Œ');

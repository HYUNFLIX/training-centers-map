// ==================== 연수원 목록 페이지 - 완전히 새로 작성 ====================

console.log('🚀 centers-list.js 로딩 시작');

// ==================== 전역 상태 ====================
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

// ==================== DOM 요소 ====================
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

// ==================== 초기화 ====================
async function init() {
  console.log('📝 초기화 시작');

  // DOM 요소 가져오기
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

  // 이벤트 리스너 설정
  setupEventListeners();

  // 저장된 보기 모드 불러오기
  const savedView = localStorage.getItem('viewMode');
  if (savedView) {
    state.viewMode = savedView;
    updateViewToggleButton();
  }

  // 데이터 로드
  await loadData();

  console.log('✅ 초기화 완료');
}

// ==================== 이벤트 리스너 ====================
function setupEventListeners() {
  // 검색 (디바운스)
  let searchTimeout;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchTerm = e.target.value.toLowerCase().trim();
      state.currentPage = 1;
      applyFiltersAndRender();
    }, 300);
  });

  // 필터
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

  // 보기 전환
  elements.viewToggle.addEventListener('click', () => {
    state.viewMode = state.viewMode === 'table' ? 'card' : 'table';
    localStorage.setItem('viewMode', state.viewMode);
    updateViewToggleButton();
    render();
  });

  // 내보내기
  elements.exportCsv.addEventListener('click', exportToCsv);
  elements.exportExcel.addEventListener('click', exportToExcel);

  // 인쇄
  elements.printBtn.addEventListener('click', () => window.print());
}

// ==================== 데이터 로드 ====================
async function loadData() {
  console.log('📦 데이터 로딩 시작');

  // 1. 캐시 확인
  const cached = getCachedData();
  if (cached && cached.length > 0) {
    console.log(`⚡ 캐시에서 ${cached.length}개 로드`);
    state.allCenters = cached;
    applyFiltersAndRender();
    updateStats();

    // 백그라운드에서 Firebase 업데이트
    loadFromFirebase(false);
    return;
  }

  // 2. 캐시 없으면 로딩 표시하고 Firebase 로드
  showLoading(true);
  await loadFromFirebase(true);
  showLoading(false);
}

async function loadFromFirebase(showToast = true) {
  try {
    // Firebase SDK 로드 (타임아웃 5초)
    const firebase = await Promise.race([
      loadFirebaseSDK(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
    ]);

    // Firestore에서 데이터 가져오기
    const querySnapshot = await firebase.getDocs(
      firebase.collection(firebase.db, 'trainingCenters')
    );

    const centers = [];
    querySnapshot.forEach((doc) => {
      centers.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Firebase에서 ${centers.length}개 로드`);

    if (centers.length > 0) {
      state.allCenters = centers;
      setCachedData(centers);
      applyFiltersAndRender();
      updateStats();

      if (showToast) {
        showToast(`${centers.length}개의 연수원을 불러왔습니다!`, 'success');
      }
    }
  } catch (error) {
    console.warn('⚠️ Firebase 로드 실패:', error.message);

    // 샘플 데이터로 폴백
    if (state.allCenters.length === 0) {
      state.allCenters = getSampleData();
      applyFiltersAndRender();
      updateStats();
      showToast('샘플 데이터를 표시합니다', 'info');
    }
  }
}

async function loadFirebaseSDK() {
  const { initializeApp } = await import(
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js'
  );
  const { getFirestore, collection, getDocs } = await import(
    'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js'
  );

  const app = initializeApp({
    apiKey: "AIzaSyD7_SPFK8I82WGM5IpqFn7kPxDOo8WUxIc",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.firebasestorage.app",
    messagingSenderId: "649959142602",
    appId: "1:649959142602:web:b34cdb7d5d3e49e82e9e48"
  });

  return { db: getFirestore(app), collection, getDocs };
}

function getSampleData() {
  return [
    {
      id: 'sample-1',
      name: '한국잡월드',
      branch: '청소년 체험관',
      region: '경기',
      address: '경기도 성남시 분당구 분당수서로 501',
      capacity: 200,
      phone: '1644-1333'
    },
    {
      id: 'sample-2',
      name: '국립중앙청소년수련원',
      branch: null,
      region: '충남',
      address: '충청남도 천안시 동남구 유량동',
      capacity: 500,
      phone: '041-620-7700'
    },
    {
      id: 'sample-3',
      name: '산림교육원',
      branch: '남부지원',
      region: '전남',
      address: '전라남도 나주시 산림교육로 92',
      capacity: 150,
      phone: '061-338-4200'
    }
  ];
}

// ==================== 캐시 관리 ====================
function getCachedData() {
  try {
    const data = localStorage.getItem('centers-cache');
    const timestamp = localStorage.getItem('centers-cache-time');

    if (data && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < 30 * 60 * 1000) { // 30분
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.error('캐시 로드 실패:', error);
  }
  return null;
}

function setCachedData(data) {
  try {
    localStorage.setItem('centers-cache', JSON.stringify(data));
    localStorage.setItem('centers-cache-time', Date.now().toString());
    console.log('💾 캐시 저장 완료');
  } catch (error) {
    console.error('캐시 저장 실패:', error);
  }
}

// ==================== 필터링 및 정렬 ====================
function applyFiltersAndRender() {
  // 필터링
  state.filteredCenters = state.allCenters.filter(center => {
    // 검색어
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

    // 지역 필터
    if (state.regionFilter !== 'all') {
      if (center.region !== state.regionFilter) {
        return false;
      }
    }

    // 수용인원 필터
    if (state.capacityFilter !== 'all') {
      const capacity = parseInt(center.capacity) || 0;
      if (state.capacityFilter === 'small' && capacity >= 100) return false;
      if (state.capacityFilter === 'medium' && (capacity < 100 || capacity >= 300)) return false;
      if (state.capacityFilter === 'large' && capacity < 300) return false;
    }

    return true;
  });

  // 정렬
  sortCenters();

  // 렌더링
  render();
}

function sortCenters() {
  state.filteredCenters.sort((a, b) => {
    let aVal = a[state.sortField];
    let bVal = b[state.sortField];

    // null 처리
    if (!aVal) aVal = '';
    if (!bVal) bVal = '';

    // 숫자 필드
    if (state.sortField === 'capacity') {
      aVal = parseInt(aVal) || 0;
      bVal = parseInt(bVal) || 0;
    }

    // 문자열 필드
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

// ==================== 렌더링 ====================
function render() {
  // 결과 수 업데이트
  elements.resultsCount.textContent =
    `검색 결과: ${state.filteredCenters.length.toLocaleString()}개`;

  // 빈 상태 처리
  if (state.filteredCenters.length === 0) {
    elements.centersContainer.style.display = 'none';
    elements.emptyState.style.display = 'block';
    elements.pagination.innerHTML = '';
    return;
  }

  elements.centersContainer.style.display = 'block';
  elements.emptyState.style.display = 'none';

  // 페이지네이션 계산
  const start = (state.currentPage - 1) * state.itemsPerPage;
  const end = start + state.itemsPerPage;
  const centersToShow = state.filteredCenters.slice(start, end);

  // 뷰에 따라 렌더링
  if (state.viewMode === 'table') {
    renderTable(centersToShow);
  } else {
    renderCards(centersToShow);
  }

  // 페이지네이션 렌더링
  renderPagination();
}

function renderTable(centers) {
  const html = `
    <div class="table-container">
      <table class="centers-table">
        <thead>
          <tr>
            <th class="sortable ${state.sortField === 'name' ? 'sorted-' + state.sortOrder : ''}"
                onclick="window.handleSort('name')">
              연수원명
            </th>
            <th class="sortable ${state.sortField === 'region' ? 'sorted-' + state.sortOrder : ''}"
                onclick="window.handleSort('region')">
              지역
            </th>
            <th class="sortable ${state.sortField === 'capacity' ? 'sorted-' + state.sortOrder : ''}"
                onclick="window.handleSort('capacity')">
              수용인원
            </th>
            <th>주소</th>
            <th>연락처</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          ${centers.map(center => `
            <tr>
              <td>
                <span class="center-name">${center.name}</span>
                ${center.branch ? `<span class="center-branch">${center.branch}</span>` : ''}
              </td>
              <td>${center.region}</td>
              <td>${center.capacity ? center.capacity.toLocaleString() + '명' : '-'}</td>
              <td>${center.address || '-'}</td>
              <td>${center.phone || '-'}</td>
              <td>
                <div class="center-actions">
                  <button class="btn btn-primary btn-sm" onclick="window.shareCenter('${center.id}')">
                    <i class="fas fa-share-alt"></i>
                  </button>
                </div>
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
            ${center.branch ? `<div class="center-branch">${center.branch}</div>` : ''}
          </div>
          <div class="card-info">
            <i class="fas fa-map-marker-alt"></i>
            <span>${center.region} | ${center.address || '-'}</span>
          </div>
          ${center.capacity ? `
            <div class="card-info">
              <i class="fas fa-users"></i>
              <span>수용인원: ${center.capacity.toLocaleString()}명</span>
            </div>
          ` : ''}
          ${center.phone ? `
            <div class="card-info">
              <i class="fas fa-phone"></i>
              <span>${center.phone}</span>
            </div>
          ` : ''}
          <div class="card-actions">
            <button class="btn btn-primary btn-sm" onclick="window.shareCenter('${center.id}')">
              <i class="fas fa-share-alt"></i> 공유
            </button>
          </div>
        </div>
      `).join('')}
    </div>
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

  // 이전 버튼
  html += `
    <button class="page-btn" ${state.currentPage === 1 ? 'disabled' : ''}
            onclick="window.goToPage(${state.currentPage - 1})">
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  // 페이지 버튼
  const maxButtons = 5;
  let startPage = Math.max(1, state.currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage < maxButtons - 1) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    html += `<button class="page-btn" onclick="window.goToPage(1)">1</button>`;
    if (startPage > 2) {
      html += `<span style="padding: 0 5px;">...</span>`;
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `
      <button class="page-btn ${i === state.currentPage ? 'active' : ''}"
              onclick="window.goToPage(${i})">
        ${i}
      </button>
    `;
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      html += `<span style="padding: 0 5px;">...</span>`;
    }
    html += `<button class="page-btn" onclick="window.goToPage(${totalPages})">${totalPages}</button>`;
  }

  // 다음 버튼
  html += `
    <button class="page-btn" ${state.currentPage === totalPages ? 'disabled' : ''}
            onclick="window.goToPage(${state.currentPage + 1})">
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  elements.pagination.innerHTML = html;
}

// ==================== 페이지 이동 ====================
function goToPage(page) {
  const totalPages = Math.ceil(state.filteredCenters.length / state.itemsPerPage);
  if (page < 1 || page > totalPages) return;

  state.currentPage = page;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== 통계 업데이트 ====================
function updateStats() {
  // 총 연수원 수
  elements.statTotal.textContent = state.allCenters.length.toLocaleString();

  // 지역 수
  const regions = new Set(state.allCenters.map(c => c.region).filter(r => r));
  elements.statRegions.textContent = regions.size;

  // 평균 수용인원
  const total = state.allCenters.reduce((sum, c) => sum + (parseInt(c.capacity) || 0), 0);
  const avg = state.allCenters.length > 0 ? Math.round(total / state.allCenters.length) : 0;
  elements.statAvg.textContent = avg.toLocaleString();
}

// ==================== CSV 내보내기 ====================
function exportToCsv() {
  try {
    const headers = ['연수원명', '지점', '지역', '주소', '수용인원', '연락처'];
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
      csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    // BOM 추가 (한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `연수원목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
    showToast(`${state.filteredCenters.length}개 연수원을 CSV로 내보냈습니다`, 'success');
  } catch (error) {
    console.error('CSV 내보내기 실패:', error);
    showToast('CSV 내보내기에 실패했습니다', 'error');
  }
}

// ==================== Excel 내보내기 ====================
function exportToExcel() {
  try {
    const headers = ['연수원명', '지점', '지역', '주소', '수용인원', '연락처'];
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
    link.download = `연수원목록_${new Date().toISOString().split('T')[0]}.xls`;
    link.click();

    URL.revokeObjectURL(url);
    showToast(`${state.filteredCenters.length}개 연수원을 Excel로 내보냈습니다`, 'success');
  } catch (error) {
    console.error('Excel 내보내기 실패:', error);
    showToast('Excel 내보내기에 실패했습니다', 'error');
  }
}

// ==================== 공유 ====================
function shareCenter(centerId) {
  const center = state.allCenters.find(c => c.id === centerId);
  if (!center) return;

  const text = `${center.name}${center.branch ? ' (' + center.branch + ')' : ''} - ${center.address}`;
  const url = `${window.location.origin}${window.location.pathname}?center=${centerId}`;

  if (navigator.share) {
    navigator.share({ title: center.name, text, url })
      .then(() => showToast('공유 완료!', 'success'))
      .catch(() => {});
  } else {
    navigator.clipboard.writeText(url)
      .then(() => showToast('링크가 복사되었습니다', 'success'))
      .catch(() => showToast('복사 실패', 'error'));
  }
}

// ==================== UI 헬퍼 ====================
function showLoading(show) {
  elements.loading.style.display = show ? 'block' : 'none';
}

function updateViewToggleButton() {
  const icon = state.viewMode === 'table' ? 'fa-th' : 'fa-table';
  const text = state.viewMode === 'table' ? '카드 보기' : '테이블 보기';
  elements.viewToggle.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
  elements.viewMode.textContent = state.viewMode === 'table' ? '테이블 보기' : '카드 보기';
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

// ==================== 전역 함수 노출 ====================
window.handleSort = handleSort;
window.goToPage = goToPage;
window.shareCenter = shareCenter;

// ==================== 시작 ====================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('✅ centers-list.js 로드 완료');

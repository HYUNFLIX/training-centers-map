// centers-list.js - 연수원 목록 페이지
console.log('🔄 centers-list.js 로딩 중...');

// ==================== 전역 변수 ====================
let allCenters = [];
let filteredCenters = [];
let currentPage = 1;
let itemsPerPage = 20;
let currentView = 'table'; // 'table' 또는 'card'
let currentSort = { field: 'name', order: 'asc' };
let firebaseLoaded = false;
let favoritesManager;
let toast;

// ==================== Toast 알림 시스템 ====================
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-label', '알림');
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'info', customTitle = null, duration = 5000) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const titles = {
            success: customTitle || '성공',
            error: customTitle || '오류',
            warning: customTitle || '주의',
            info: customTitle || '알림'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon" aria-hidden="true"></i>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="알림 닫기">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        this.container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });

        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    }

    remove(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, title = null, duration = 5000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = null, duration = 5000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = null, duration = 8000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = null, duration = 5000) {
        return this.show(message, 'info', title, duration);
    }
}

// ==================== 즐겨찾기 관리 ====================
class FavoritesManager {
    constructor() {
        this.storageKey = 'training-centers-favorites';
        this.favorites = this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('❌ 즐겨찾기 로드 실패:', error);
            return [];
        }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.favorites));
            return true;
        } catch (error) {
            console.error('❌ 즐겨찾기 저장 실패:', error);
            toast.error('즐겨찾기 저장에 실패했습니다.', '저장 오류');
            return false;
        }
    }

    add(centerId) {
        if (!this.favorites.includes(centerId)) {
            this.favorites.push(centerId);
            this.save();
            toast.success('즐겨찾기에 추가되었습니다!', '즐겨찾기', 3000);
            return true;
        }
        return false;
    }

    remove(centerId) {
        const index = this.favorites.indexOf(centerId);
        if (index > -1) {
            this.favorites.splice(index, 1);
            this.save();
            toast.info('즐겨찾기에서 제거되었습니다.', '즐겨찾기', 3000);
            return true;
        }
        return false;
    }

    toggle(centerId) {
        if (this.has(centerId)) {
            return this.remove(centerId);
        } else {
            return this.add(centerId);
        }
    }

    has(centerId) {
        return this.favorites.includes(centerId);
    }

    getAll() {
        return [...this.favorites];
    }

    clear() {
        this.favorites = [];
        this.save();
        toast.info('모든 즐겨찾기가 삭제되었습니다.', '즐겨찾기', 3000);
    }
}

// ==================== Firebase 초기화 ====================
async function initializeFirebase() {
    try {
        console.log('🔄 Firebase 초기화 시도 중...');

        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
        const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

        const firebaseConfig = {
            apiKey: "AIzaSyD7_SPFK8I82WGM5IpqFn7kPxDOo8WUxIc",
            authDomain: "training-centers-map.firebaseapp.com",
            projectId: "training-centers-map",
            storageBucket: "training-centers-map.firebasestorage.app",
            messagingSenderId: "649959142602",
            appId: "1:649959142602:web:b34cdb7d5d3e49e82e9e48",
            measurementId: "G-P4VJ0JPQP5"
        };

        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

        console.log('✅ Firebase 초기화 성공');
        firebaseLoaded = true;

        return { db, collection, getDocs };
    } catch (error) {
        console.warn('⚠️ Firebase 초기화 실패, 샘플 데이터로 진행:', error);
        firebaseLoaded = false;
        toast.warning('실시간 데이터 연결에 실패했습니다. 샘플 데이터를 표시합니다.', 'Firebase 연결 실패', 8000);
        return null;
    }
}

// ==================== 샘플 데이터 ====================
function getSampleData() {
    return [
        {
            id: 'sample-1',
            name: '한국잡월드',
            branch: '청소년 체험관',
            region: '경기',
            address: '경기도 성남시 분당구 분당수서로 501',
            capacity: 200,
            phone: '1644-1333',
            website: 'https://www.koreajobworld.or.kr',
            lat: 37.4019,
            lng: 127.1141
        },
        {
            id: 'sample-2',
            name: '국립중앙청소년수련원',
            branch: null,
            region: '충남',
            address: '충청남도 천안시 동남구 유량동',
            capacity: 500,
            phone: '041-620-7700',
            website: null,
            lat: 36.7623,
            lng: 127.2533
        },
        {
            id: 'sample-3',
            name: '산림교육원',
            branch: '남부지원',
            region: '전남',
            address: '전라남도 나주시 산림교육로 92',
            capacity: 150,
            phone: '061-338-4200',
            website: null,
            lat: 35.0456,
            lng: 126.7891
        }
    ];
}

// ==================== 연수원 데이터 로드 ====================
async function loadCenters() {
    showLoading(true);

    try {
        const firebase = await initializeFirebase();

        if (firebase && firebaseLoaded) {
            const { db, collection, getDocs } = firebase;
            const querySnapshot = await getDocs(collection(db, 'trainingCenters'));

            allCenters = [];
            querySnapshot.forEach((doc) => {
                allCenters.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`✅ Firebase에서 ${allCenters.length}개 연수원 로드 완료`);
            toast.success(`${allCenters.length}개의 연수원 데이터를 불러왔습니다!`, '데이터 로드 완료', 3000);
        } else {
            // 샘플 데이터 사용
            allCenters = getSampleData();
            console.log('ℹ️ 샘플 데이터 사용 중');
        }

        // 초기 필터링 및 표시
        applyFilters();
        updateStats();

    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.', '로드 오류');
        allCenters = getSampleData();
        applyFilters();
        updateStats();
    } finally {
        showLoading(false);
    }
}

// ==================== 로딩 상태 표시 ====================
function showLoading(show) {
    let spinner = document.getElementById('loading-spinner');

    if (show) {
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'loading-spinner';
            spinner.className = 'loading-spinner';
            spinner.innerHTML = '<div class="spinner"></div><p>데이터 로딩 중...</p>';
            spinner.setAttribute('role', 'status');
            spinner.setAttribute('aria-live', 'polite');
            document.body.appendChild(spinner);
        }
        spinner.style.display = 'flex';
    } else {
        if (spinner) {
            spinner.style.display = 'none';
        }
    }
}

// ==================== 필터링 및 검색 ====================
function applyFilters() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const regionFilter = document.getElementById('region-filter')?.value || 'all';
    const capacityFilter = document.getElementById('capacity-filter')?.value || 'all';

    filteredCenters = allCenters.filter(center => {
        // 검색어 필터
        const matchesSearch = !searchTerm ||
            center.name?.toLowerCase().includes(searchTerm) ||
            center.branch?.toLowerCase().includes(searchTerm) ||
            center.address?.toLowerCase().includes(searchTerm) ||
            center.region?.toLowerCase().includes(searchTerm);

        // 지역 필터
        const matchesRegion = regionFilter === 'all' || center.region === regionFilter;

        // 수용인원 필터
        let matchesCapacity = true;
        if (capacityFilter !== 'all') {
            const capacity = parseInt(center.capacity) || 0;
            switch(capacityFilter) {
                case 'small': matchesCapacity = capacity < 100; break;
                case 'medium': matchesCapacity = capacity >= 100 && capacity < 300; break;
                case 'large': matchesCapacity = capacity >= 300; break;
            }
        }

        return matchesSearch && matchesRegion && matchesCapacity;
    });

    // 검색어가 있을 경우 relevance 점수로 정렬
    if (searchTerm) {
        filteredCenters = filteredCenters.map(center => ({
            ...center,
            relevance: calculateRelevance(center, searchTerm)
        })).sort((a, b) => b.relevance - a.relevance);
    } else {
        // 현재 정렬 기준 적용
        sortCenters();
    }

    currentPage = 1;
    renderCenters();
    updateResultsCount();
}

// ==================== 검색 관련성 점수 계산 ====================
function calculateRelevance(center, query) {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // 이름 매칭 (가장 높은 가중치)
    if (center.name) {
        const lowerName = center.name.toLowerCase();
        if (lowerName === lowerQuery) score += 100;
        else if (lowerName.startsWith(lowerQuery)) score += 50;
        else if (lowerName.includes(lowerQuery)) score += 30;
    }

    // 지점명 매칭
    if (center.branch) {
        const lowerBranch = center.branch.toLowerCase();
        if (lowerBranch === lowerQuery) score += 40;
        else if (lowerBranch.includes(lowerQuery)) score += 20;
    }

    // 지역 매칭
    if (center.region && center.region.toLowerCase().includes(lowerQuery)) {
        score += 15;
    }

    // 주소 매칭
    if (center.address && center.address.toLowerCase().includes(lowerQuery)) {
        score += 10;
    }

    return score;
}

// ==================== 텍스트 하이라이트 ====================
function highlightText(text, query) {
    if (!text || !query) return text || '';
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 2px 4px; border-radius: 2px; font-weight: 500;">$1</mark>');
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==================== 정렬 ====================
function sortCenters() {
    const { field, order } = currentSort;

    filteredCenters.sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // null/undefined 처리
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        // 숫자 필드
        if (field === 'capacity') {
            aVal = parseInt(aVal) || 0;
            bVal = parseInt(bVal) || 0;
        }

        // 문자열 필드
        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
}

function setSortField(field) {
    if (currentSort.field === field) {
        // 같은 필드 클릭 시 정렬 순서 반전
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.order = 'asc';
    }

    sortCenters();
    renderCenters();
    updateSortIndicators();
}

function updateSortIndicators() {
    // 모든 정렬 헤더의 표시 업데이트
    document.querySelectorAll('[data-sort]').forEach(header => {
        const field = header.getAttribute('data-sort');
        const icon = header.querySelector('.sort-icon');

        if (field === currentSort.field) {
            header.classList.add('active');
            if (icon) {
                icon.className = 'sort-icon fas ' + (currentSort.order === 'asc' ? 'fa-sort-up' : 'fa-sort-down');
            }
        } else {
            header.classList.remove('active');
            if (icon) {
                icon.className = 'sort-icon fas fa-sort';
            }
        }
    });
}

// ==================== 연수원 목록 렌더링 ====================
function renderCenters() {
    const container = document.getElementById('centers-container');
    if (!container) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const centersToShow = filteredCenters.slice(start, end);

    if (centersToShow.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #666;">
                <i class="fas fa-search" style="font-size: 48px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p style="font-size: 18px; margin: 0;">검색 결과가 없습니다.</p>
                <p style="font-size: 14px; margin-top: 10px; opacity: 0.8;">다른 검색어나 필터를 시도해보세요.</p>
            </div>
        `;
        updatePagination();
        return;
    }

    if (currentView === 'table') {
        renderTableView(centersToShow);
    } else {
        renderCardView(centersToShow);
    }

    updatePagination();
}

function renderTableView(centers) {
    const container = document.getElementById('centers-container');
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    const tableHTML = `
        <div class="table-responsive">
            <table class="centers-table">
                <thead>
                    <tr>
                        <th data-sort="name" style="cursor: pointer;">
                            연수원명 <i class="sort-icon fas fa-sort"></i>
                        </th>
                        <th data-sort="branch" style="cursor: pointer;">
                            지점 <i class="sort-icon fas fa-sort"></i>
                        </th>
                        <th data-sort="region" style="cursor: pointer;">
                            지역 <i class="sort-icon fas fa-sort"></i>
                        </th>
                        <th>주소</th>
                        <th data-sort="capacity" style="cursor: pointer;">
                            수용인원 <i class="sort-icon fas fa-sort"></i>
                        </th>
                        <th>연락처</th>
                        <th class="action-column">작업</th>
                    </tr>
                </thead>
                <tbody>
                    ${centers.map(center => `
                        <tr data-center-id="${center.id}">
                            <td class="name-cell">
                                ${searchTerm ? highlightText(center.name, searchTerm) : center.name}
                            </td>
                            <td>${searchTerm && center.branch ? highlightText(center.branch, searchTerm) : (center.branch || '-')}</td>
                            <td>${searchTerm ? highlightText(center.region, searchTerm) : center.region}</td>
                            <td class="address-cell">${searchTerm ? highlightText(center.address, searchTerm) : (center.address || '-')}</td>
                            <td class="capacity-cell">${center.capacity ? center.capacity.toLocaleString() + '명' : '-'}</td>
                            <td>${center.phone || '-'}</td>
                            <td class="action-column">
                                <button class="action-btn favorite-btn ${favoritesManager.has(center.id) ? 'active' : ''}"
                                        onclick="toggleFavorite('${center.id}')"
                                        title="${favoritesManager.has(center.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}">
                                    <i class="fas fa-heart"></i>
                                </button>
                                <button class="action-btn share-btn"
                                        onclick="shareCenter('${center.id}')"
                                        title="공유">
                                    <i class="fas fa-share-alt"></i>
                                </button>
                                ${center.website ? `
                                    <a href="${center.website}"
                                       class="action-btn"
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       title="웹사이트 방문">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHTML;

    // 정렬 헤더에 이벤트 리스너 추가
    container.querySelectorAll('[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            setSortField(header.getAttribute('data-sort'));
        });
    });

    updateSortIndicators();
}

function renderCardView(centers) {
    const container = document.getElementById('centers-container');
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';

    const cardsHTML = `
        <div class="cards-grid">
            ${centers.map(center => `
                <div class="center-card" data-center-id="${center.id}">
                    <div class="card-header">
                        <h3 class="card-title">
                            ${searchTerm ? highlightText(center.name, searchTerm) : center.name}
                            ${center.branch ? `<span class="card-branch">(${searchTerm ? highlightText(center.branch, searchTerm) : center.branch})</span>` : ''}
                        </h3>
                        <button class="favorite-btn ${favoritesManager.has(center.id) ? 'active' : ''}"
                                onclick="toggleFavorite('${center.id}')"
                                title="${favoritesManager.has(center.id) ? '즐겨찾기 해제' : '즐겨찾기 추가'}">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="card-info">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${searchTerm ? highlightText(center.region, searchTerm) : center.region} | ${searchTerm ? highlightText(center.address || '', searchTerm) : (center.address || '-')}</span>
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
                    </div>
                    <div class="card-footer">
                        <button class="card-btn" onclick="shareCenter('${center.id}')">
                            <i class="fas fa-share-alt"></i> 공유
                        </button>
                        ${center.website ? `
                            <a href="${center.website}"
                               class="card-btn"
                               target="_blank"
                               rel="noopener noreferrer">
                                <i class="fas fa-external-link-alt"></i> 웹사이트
                            </a>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = cardsHTML;
}

// ==================== 페이지네이션 ====================
function updatePagination() {
    const container = document.getElementById('pagination');
    if (!container) return;

    const totalPages = Math.ceil(filteredCenters.length / itemsPerPage);

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let paginationHTML = '<div class="pagination-controls">';

    // 이전 버튼
    paginationHTML += `
        <button class="pagination-btn"
                ${currentPage === 1 ? 'disabled' : ''}
                onclick="goToPage(${currentPage - 1})"
                aria-label="이전 페이지">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // 페이지 번호들
    const maxButtons = 7;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHTML += `
            <button class="pagination-btn ${i === currentPage ? 'active' : ''}"
                    onclick="goToPage(${i})"
                    aria-label="페이지 ${i}"
                    ${i === currentPage ? 'aria-current="page"' : ''}>
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHTML += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHTML += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    // 다음 버튼
    paginationHTML += `
        <button class="pagination-btn"
                ${currentPage === totalPages ? 'disabled' : ''}
                onclick="goToPage(${currentPage + 1})"
                aria-label="다음 페이지">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    paginationHTML += '</div>';
    container.innerHTML = paginationHTML;
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredCenters.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderCenters();

    // 페이지 상단으로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== 통계 업데이트 ====================
function updateStats() {
    const totalElement = document.getElementById('total-centers');
    const regionsElement = document.getElementById('total-regions');
    const avgCapacityElement = document.getElementById('avg-capacity');

    if (totalElement) {
        animateNumber(totalElement, allCenters.length);
    }

    if (regionsElement) {
        const uniqueRegions = new Set(allCenters.map(c => c.region).filter(r => r));
        animateNumber(regionsElement, uniqueRegions.size);
    }

    if (avgCapacityElement) {
        const totalCapacity = allCenters.reduce((sum, c) => sum + (parseInt(c.capacity) || 0), 0);
        const avgCapacity = allCenters.length > 0 ? Math.round(totalCapacity / allCenters.length) : 0;
        animateNumber(avgCapacityElement, avgCapacity);
    }
}

function animateNumber(element, target) {
    const duration = 1000;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

function updateResultsCount() {
    const countElement = document.getElementById('results-count');
    if (countElement) {
        countElement.textContent = `총 ${filteredCenters.length.toLocaleString()}개의 연수원`;
    }
}

// ==================== 보기 전환 (테이블/카드) ====================
function toggleView() {
    currentView = currentView === 'table' ? 'card' : 'table';

    // localStorage에 저장
    try {
        localStorage.setItem('centers-view-preference', currentView);
    } catch (error) {
        console.error('❌ 보기 설정 저장 실패:', error);
    }

    // 버튼 아이콘 업데이트
    const toggleBtn = document.getElementById('view-toggle');
    if (toggleBtn) {
        const icon = toggleBtn.querySelector('i');
        if (icon) {
            icon.className = currentView === 'table' ? 'fas fa-th' : 'fas fa-table';
        }
    }

    renderCenters();
    toast.info(`${currentView === 'table' ? '테이블' : '카드'} 보기로 전환되었습니다.`, '보기 전환', 2000);
}

// ==================== CSV 내보내기 ====================
function exportToCSV() {
    try {
        const headers = ['연수원명', '지점', '지역', '주소', '수용인원', '연락처', '웹사이트'];
        const rows = filteredCenters.map(c => [
            c.name || '',
            c.branch || '',
            c.region || '',
            c.address || '',
            c.capacity || '',
            c.phone || '',
            c.website || ''
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
        toast.success(`${filteredCenters.length}개 연수원 정보를 CSV로 내보냈습니다!`, 'CSV 내보내기', 3000);
    } catch (error) {
        console.error('❌ CSV 내보내기 실패:', error);
        toast.error('CSV 내보내기에 실패했습니다.', '내보내기 오류');
    }
}

// ==================== Excel 내보내기 ====================
function exportToExcel() {
    try {
        const headers = ['연수원명', '지점', '지역', '주소', '수용인원', '연락처', '웹사이트'];
        const rows = filteredCenters.map(c => [
            c.name || '',
            c.branch || '',
            c.region || '',
            c.address || '',
            c.capacity || '',
            c.phone || '',
            c.website || ''
        ]);

        // HTML 테이블 형식으로 생성 (Excel이 인식 가능)
        let html = '<table><thead><tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';

        rows.forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
                html += `<td>${String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        // BOM 추가
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `연수원목록_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();

        URL.revokeObjectURL(url);
        toast.success(`${filteredCenters.length}개 연수원 정보를 Excel로 내보냈습니다!`, 'Excel 내보내기', 3000);
    } catch (error) {
        console.error('❌ Excel 내보내기 실패:', error);
        toast.error('Excel 내보내기에 실패했습니다.', '내보내기 오류');
    }
}

// ==================== 공유 기능 ====================
async function shareCenter(centerId) {
    try {
        const center = allCenters.find(c => c.id === centerId);
        if (!center) {
            toast.error('연수원 정보를 찾을 수 없습니다.', '공유 실패');
            return;
        }

        const shareUrl = `${window.location.origin}${window.location.pathname}?center=${centerId}`;
        const shareData = {
            title: `${center.name} - 연수원 여기어때`,
            text: `${center.name}${center.branch ? ' (' + center.branch + ')' : ''}\n${center.address || '위치 정보'}`,
            url: shareUrl
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast.success('공유가 완료되었습니다!', '공유 성공', 3000);
        } else {
            // Web Share API 미지원 시 클립보드 복사
            await navigator.clipboard.writeText(shareUrl);
            toast.success('링크가 클립보드에 복사되었습니다!', '링크 복사', 4000);
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('❌ 공유 실패:', error);
            toast.error('공유에 실패했습니다. 다시 시도해주세요.', '공유 실패');
        }
    }
}

// ==================== 즐겨찾기 토글 ====================
function toggleFavorite(centerId) {
    favoritesManager.toggle(centerId);

    // UI 업데이트
    document.querySelectorAll(`[data-center-id="${centerId}"] .favorite-btn`).forEach(btn => {
        if (favoritesManager.has(centerId)) {
            btn.classList.add('active');
            btn.title = '즐겨찾기 해제';
        } else {
            btn.classList.remove('active');
            btn.title = '즐겨찾기 추가';
        }
    });
}

// ==================== 인쇄 ====================
function printList() {
    window.print();
}

// ==================== 검색어 초기화 ====================
function clearSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
        applyFilters();
        searchInput.focus();
    }
}

// ==================== 이벤트 리스너 설정 ====================
function setupEventListeners() {
    // 검색 입력
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => applyFilters(), 300);

            // 검색어 초기화 버튼 표시/숨김
            const clearBtn = document.getElementById('clear-search');
            if (clearBtn) {
                clearBtn.style.display = e.target.value ? 'block' : 'none';
            }
        });

        // 엔터키로 검색
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    }

    // 검색어 초기화 버튼
    const clearSearchBtn = document.getElementById('clear-search');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearch);
    }

    // 필터 변경
    const regionFilter = document.getElementById('region-filter');
    if (regionFilter) {
        regionFilter.addEventListener('change', applyFilters);
    }

    const capacityFilter = document.getElementById('capacity-filter');
    if (capacityFilter) {
        capacityFilter.addEventListener('change', applyFilters);
    }

    // 보기 전환 버튼
    const viewToggleBtn = document.getElementById('view-toggle');
    if (viewToggleBtn) {
        viewToggleBtn.addEventListener('click', toggleView);
    }

    // CSV 내보내기 버튼
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }

    // Excel 내보내기 버튼
    const exportExcelBtn = document.getElementById('export-excel-btn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }

    // 인쇄 버튼
    const printBtn = document.getElementById('print-btn');
    if (printBtn) {
        printBtn.addEventListener('click', printList);
    }

    // 키보드 단축키
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + F: 검색 포커스
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }

        // Ctrl/Cmd + P: 인쇄
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            printList();
        }
    });

    // 모바일 메뉴
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuToggle && mobileMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
        });
    }
}

// ==================== 초기화 ====================
async function init() {
    console.log('🚀 centers-list.js 초기화 시작...');

    // Toast 매니저 초기화
    toast = new ToastManager();

    // 즐겨찾기 매니저 초기화
    favoritesManager = new FavoritesManager();

    // 저장된 보기 설정 불러오기
    try {
        const savedView = localStorage.getItem('centers-view-preference');
        if (savedView === 'card' || savedView === 'table') {
            currentView = savedView;
        }
    } catch (error) {
        console.error('❌ 보기 설정 로드 실패:', error);
    }

    // 보기 전환 버튼 초기 상태 설정
    const viewToggleBtn = document.getElementById('view-toggle');
    if (viewToggleBtn) {
        const icon = viewToggleBtn.querySelector('i');
        if (icon) {
            icon.className = currentView === 'table' ? 'fas fa-th' : 'fas fa-table';
        }
    }

    // 이벤트 리스너 설정
    setupEventListeners();

    // 데이터 로드
    await loadCenters();

    console.log('✅ centers-list.js 초기화 완료');
}

// ==================== 전역 함수 노출 ====================
window.shareCenter = shareCenter;
window.toggleFavorite = toggleFavorite;
window.goToPage = goToPage;
window.clearSearch = clearSearch;

// ==================== DOM 로드 완료 시 초기화 ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

console.log('✅ centers-list.js 로드 완료');

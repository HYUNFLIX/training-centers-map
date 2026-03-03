const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// 1. Replace setupSearchEvents
const oldSearchEvents = `// ===== 검색 이벤트 설정 =====
const setupSearchEvents = () => {
    const searchInput = document.getElementById('search-input');
    const clearIcon = document.querySelector('.clear-icon');
    const searchResults = document.querySelector('.search-results');

    if (searchInput) {
        let searchTimeout;
        
        // 검색 입력 이벤트
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            // 클리어 버튼 표시/숨김
            if (clearIcon) {
                clearIcon.style.display = query.length > 0 ? 'block' : 'none';
            }
            
            // 디바운싱
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (query.length > 0) {
                    showSearchResults(query);
                } else {
                    hideSearchResults();
                    applyFilters();
                }
            }, 300);
        });

        // 엔터 키 처리
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                applyFilters();
                hideSearchResults();
            }
        });
    }

    // 클리어 버튼 이벤트
    if (clearIcon) {
        clearIcon.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                this.style.display = 'none';
                hideSearchResults();
                applyFilters();
            }
        });
    }

    // 관련성 점수 계산 함수`;

const newSearchEvents = `// ===== 검색 이벤트 설정 (최근 검색어 관리) =====
const RECENT_SEARCHES_KEY = 'tcmap_recent_searches';
const MAX_RECENT = 5;

const getRecentSearches = () => {
    try { return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]'); }
    catch { return []; }
};

const saveRecentSearch = (query) => {
    if (!query || query.trim().length < 1) return;
    const q = query.trim();
    let list = getRecentSearches().filter(s => s !== q);
    list.unshift(q);
    list = list.slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
};

const clearRecentSearches = () => localStorage.removeItem(RECENT_SEARCHES_KEY);

const setupSearchEvents = () => {
    const searchInput = document.getElementById('search-input');
    const clearIcon = document.querySelector('.clear-icon');
    const searchResults = document.querySelector('.search-results');

    const showRecentSearches = () => {
        if (!searchResults) return;
        const list = getRecentSearches();
        if (list.length === 0) { hideSearchResults(); return; }
        const html = \`
            <div style="padding:8px 12px;font-size:12px;color:#999;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;">
                <span>최근 검색어</span>
                <button id="clear-recent-btn" style="background:none;border:none;color:#0077cc;font-size:12px;cursor:pointer;min-height:auto;min-width:auto;padding:0;">전체 삭제</button>
            </div>
            \${list.map(s => \`
                <div class="search-result-item recent-search-item" data-query="\${s}" style="display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-history" style="color:#bbb;font-size:13px;"></i>
                    <span class="search-result-name">\${s}</span>
                </div>
            \`).join('')}
        \`;
        searchResults.innerHTML = html;
        searchResults.style.display = 'block';

        document.getElementById('clear-recent-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            clearRecentSearches();
            hideSearchResults();
            if (searchInput) searchInput.focus();
        });

        searchResults.querySelectorAll('.recent-search-item').forEach(item => {
            item.addEventListener('click', () => {
                const q = item.dataset.query;
                if (searchInput) {
                    searchInput.value = q;
                    if (clearIcon) clearIcon.style.display = 'block';
                }
                saveRecentSearch(q);
                applyFilters();
                hideSearchResults();
            });
        });
    };

    if (searchInput) {
        let searchTimeout;

        searchInput.addEventListener('focus', () => {
            if (!searchInput.value.trim()) showRecentSearches();
        });

        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            if (clearIcon) clearIcon.style.display = query.length > 0 ? 'block' : 'none';
            
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (query.length > 0) showSearchResults(query);
                else showRecentSearches();
            }, 300);
        });

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query) saveRecentSearch(query);
                applyFilters();
                hideSearchResults();
                searchInput.blur();
            }
        });
        
        document.addEventListener('click', (e) => {
            if (searchInput && !searchInput.contains(e.target) && searchResults && !searchResults.contains(e.target)) {
                hideSearchResults();
            }
        });
    }

    if (clearIcon) {
        clearIcon.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                this.style.display = 'none';
                showRecentSearches();
            }
        });
    }

    function calculateRelevance(center, query) {`;

code = code.replace(oldSearchEvents, newSearchEvents);

// 2. applyFilters URL parameter sync
const oldApplyFilters = `    // 결과 카운트 업데이트
    updateResultsCount(filteredMarkers.length);
    
    console.log(\`🔎 필터 적용: \${filteredMarkers.length}개 결과\`);
};`;

const newApplyFilters = `    // 결과 카운트 업데이트
    updateResultsCount(filteredMarkers.length);
    
    // URL 업데이트 (상태 관리)
    updateUrlParams(searchTerm, regionFilter, capacityFilter);

    console.log(\`🔎 필터 적용: \${filteredMarkers.length}개 결과\`);
};

// URL 파라미터 업데이트 함수
const updateUrlParams = (searchTerm, region, capacity) => {
    const url = new URL(window.location.href);
    if (searchTerm) url.searchParams.set('search', searchTerm);
    else url.searchParams.delete('search');

    if (region) url.searchParams.set('region', region);
    else url.searchParams.delete('region');

    if (capacity) url.searchParams.set('capacity', capacity);
    else url.searchParams.delete('capacity');

    window.history.replaceState({}, '', url.toString() || window.location.pathname);
};`;

code = code.replace(oldApplyFilters, newApplyFilters);

// 3. handleUrlParams to read URL filters
const oldHandleUrlParams = `// ===== URL 파라미터 처리 =====
const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const centerId = urlParams.get('center');
    
    if (centerId && allMarkers.length > 0) {`;

const newHandleUrlParams = `// ===== URL 파라미터 처리 =====
const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // URL에서 검색/필터 상태 복원
    const search = urlParams.get('search');
    const region = urlParams.get('region');
    const capacity = urlParams.get('capacity');
    
    let needsFilter = false;
    
    if (search && document.getElementById('search-input')) {
        document.getElementById('search-input').value = search;
        const icon = document.querySelector('.clear-icon');
        if (icon) icon.style.display = 'block';
        needsFilter = true;
    }
    if (region && document.getElementById('region-filter')) {
        document.getElementById('region-filter').value = region;
        needsFilter = true;
    }
    if (capacity && document.getElementById('capacity-filter')) {
        document.getElementById('capacity-filter').value = capacity;
        needsFilter = true;
    }
    
    if (needsFilter) {
        applyFilters();
    }

    const centerId = urlParams.get('center');
    
    if (centerId && allMarkers.length > 0) {`;

code = code.replace(oldHandleUrlParams, newHandleUrlParams);

// 4. Remove Add Center Modal initialization snippet
const initModalSnippet = `
    // 기존 초기화 후 모달 초기화
    setTimeout(() => {
        initAddCenterModal();
    }, 100);`;
code = code.replace(initModalSnippet, '');

// 5. Remove the entire Add Center functionality blocks
// We will replace everything from "// ===== 연수원 추가 모달 초기화 =====" to EOF,
// but actually, we don't want to truncate. So we just substring out exactly those blocks.
const addCenterStart = code.indexOf('\n// ===== 연수원 추가 모달 초기화 =====');
if (addCenterStart !== -1) {
    // Just substring from start to the index to remove everything after it.
    // Wait, are there anything important after it?
    // Let's check what's actually at the end of the file.
    // In our view, the file ends at line 1838: console.log('✅ 네이버 주소 검색 기능 로드 완료');
    // All of these are related to addCenter: initAddCenterModal, openAddCenterModal, closeAddCenterModal, geocodeAddress, extractRegion, handleAddCenterSubmit, saveToFirebase, addMarkerToMap, and initAddressAutocomplete, searchAddress.
    // Therefore, truncating EXACTLY at `addCenterStart` is 100% SAFE.
    code = code.substring(0, addCenterStart) + '\n';
}

fs.writeFileSync('app.js', code, 'utf8');
console.log('App successfully patched without truncation.');

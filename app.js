// ====== 수정된 app.js 파일 (로딩 문제 해결) ======

// Firebase 초기화 (에러 처리 포함)
let db = null;
let firebaseLoaded = false;

async function initializeFirebase() {
    try {
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
        const { getFirestore, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        const firebaseConfig = {
            apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
            authDomain: "training-centers-map.firebaseapp.com",
            projectId: "training-centers-map",
            storageBucket: "training-centers-map.firebasestorage.app",
            messagingSenderId: "943690141587",
            appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
        };

        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        firebaseLoaded = true;
        
        // 전역으로 노출
        window.firebase = { db, collection, getDocs };
        
        console.log('✅ Firebase 초기화 성공');
        return { db, collection, getDocs };
    } catch (error) {
        console.warn('⚠️ Firebase 초기화 실패:', error);
        firebaseLoaded = false;
        return null;
    }
}

// 전역 변수
let map;
let allMarkers = [];
let filteredMarkers = [];
let clusterer = null;
let infoWindowManager = null;

// ===== 개선된 정보창 관리자 클래스 =====
class InfoWindowManager {
    constructor() {
        this.currentInfoWindow = null;
        this.currentMarker = null;
        this.setupEventDelegation();
        console.log('✅ 정보창 관리자 초기화 완료');
    }

    setupEventDelegation() {
        document.addEventListener('click', (event) => {
            const closeBtn = event.target.closest('.info-window-close');
            if (closeBtn) {
                event.preventDefault();
                event.stopPropagation();
                this.closeCurrentInfoWindow();
                console.log('🔽 정보창 닫힌');
            }
        });
    }

    openInfoWindow(map, marker, content) {
        this.closeCurrentInfoWindow();
        
        try {
            const infoWindow = new naver.maps.InfoWindow({
                content: content,
                backgroundColor: "#fff",
                borderWidth: 0,
                borderColor: "transparent",
                anchorSize: new naver.maps.Size(6, 6),
                anchorSkew: true,
                anchorColor: "#fff",
                pixelOffset: new naver.maps.Point(10, -20),
                contentPadding: 0,
                boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
                borderRadius: '8px',
                disableAnchor: false,
                closeButtonDisplay: false
            });

            infoWindow.open(map, marker);
            this.currentInfoWindow = infoWindow;
            this.currentMarker = marker;
            
            console.log('🔼 정보창 열림:', marker.getTitle());
            return infoWindow;
        } catch (error) {
            console.error('❌ 정보창 열기 실패:', error);
            return null;
        }
    }

    closeCurrentInfoWindow() {
        if (this.currentInfoWindow) {
            try {
                this.currentInfoWindow.close();
            } catch (error) {
                console.warn('⚠️ 정보창 닫기 중 오류:', error);
            }
            this.currentInfoWindow = null;
            this.currentMarker = null;
        }
    }

    getCurrentInfoWindow() {
        return this.currentInfoWindow;
    }

    getCurrentMarker() {
        return this.currentMarker;
    }
}

// 마커 아이콘 HTML 생성 함수
const createMarkerContent = (name) => {
    return `
        <div class="marker-container">
            <div class="marker-content">
                <div class="marker-icon">
                    <div class="icon-circle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                            <path fill="white" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                    </div>
                </div>
                <span class="marker-text">${name}</span>
            </div>
            <div class="marker-pointer"></div>
        </div>
    `;
};

// 정보창 내용 HTML 생성 함수
const createInfoWindowContent = (center) => {
    const addressHtml = center.address ? 
        `<div class="info-address">
            <i class="fas fa-map-marker-alt"></i> ${center.address}
        </div>` : '';
    
    let tagHtml = '';
    
    if (center.capacity) {
        tagHtml += `
            <div class="info-tag">
                <i class="fas fa-users"></i> 수용인원: ${center.capacity}명
            </div>
        `;
    }
    
    if (center.region) {
        tagHtml += `
            <div class="info-tag">
                <i class="fas fa-map-marker-alt"></i> ${center.region}
            </div>
        `;
    }
    
    const infoHtml = center.basicInfo ?
        `<div class="info-description">
            ${center.basicInfo}
        </div>` : '';
    
    let linksHtml = '';
    
    if (center.links?.website) {
        linksHtml += `
            <a href="${center.links.website}" target="_blank" class="info-link">
                <i class="fas fa-globe"></i> 웹사이트
            </a>
        `;
    }
    
    if (center.links?.naver) {
        linksHtml += `
            <a href="${center.links.naver}" target="_blank" class="info-link">
                <i class="fas fa-map"></i> 네이버 지도
            </a>
        `;
    }
    
    return `
        <div class="custom-info-window">
            <div class="info-window-header">
                <h3 class="info-window-title">${center.name}</h3>
                <button class="info-window-close"><i class="fas fa-times"></i></button>
            </div>
            
            ${center.branch ? `<p class="info-window-branch">${center.branch}</p>` : ''}
            
            ${addressHtml}
            
            ${infoHtml}
            
            <div class="info-window-tags">
                ${tagHtml}
            </div>
            
            <div class="info-window-links">
                ${linksHtml}
            </div>
        </div>
    `;
};

// 샘플 데이터 생성 (Firebase 연결 실패 시)
const generateSampleData = () => {
    return [
        {
            id: 'sample1',
            name: '서울교육연수원',
            branch: '강남지점',
            basicInfo: '최신 시설을 갖춘 교육전문 연수원입니다. 다양한 교육 프로그램과 편의시설을 제공합니다.',
            region: '서울',
            capacity: 150,
            location: { lat: 37.4979, lng: 127.0276 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample2',
            name: '경기연수원',
            branch: '수원지점',
            basicInfo: '자연 친화적 환경의 대규모 연수시설입니다. 숙박시설과 체육시설이 완비되어 있습니다.',
            region: '경기',
            capacity: 300,
            location: { lat: 37.2636, lng: 127.0286 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample3',
            name: '부산연수원',
            branch: '해운대지점',
            basicInfo: '바다가 보이는 아름다운 연수원입니다. 해양스포츠와 연계한 특별 프로그램을 운영합니다.',
            region: '부산',
            capacity: 200,
            location: { lat: 35.1595, lng: 129.1615 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample4',
            name: '대전교육센터',
            branch: '유성지점',
            basicInfo: '과학도시 대전의 첨단 교육시설입니다. IT 교육에 특화된 장비와 시설을 보유하고 있습니다.',
            region: '대전',
            capacity: 120,
            location: { lat: 36.3504, lng: 127.3845 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample5',
            name: '제주연수원',
            branch: '제주시지점',
            basicInfo: '아름다운 제주도의 자연 속에서 진행되는 특별한 연수 경험을 제공합니다.',
            region: '제주',
            capacity: 80,
            location: { lat: 33.4996, lng: 126.5312 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        }
    ];
};

// 지도 초기화 함수
const initMap = async () => {
    try {
        console.log('🗺️ 지도 초기화 시작');
        
        // 네이버 지도 API 로드 확인
        if (typeof naver === 'undefined' || !naver.maps) {
            console.error('❌ 네이버 지도 API가 로드되지 않았습니다');
            showError('지도 API 로드 실패');
            return;
        }

        // 지도 생성
        map = new naver.maps.Map('map', {
            center: new naver.maps.LatLng(36.2253017, 127.6460516),
            zoom: 7,
            zoomControl: false,
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: naver.maps.MapTypeControlStyle.DROPDOWN,
                position: naver.maps.Position.TOP_RIGHT
            }
        });

        console.log('✅ 지도 생성 완료');

        // 정보창 관리자 초기화
        infoWindowManager = new InfoWindowManager();

        // 지도 컨트롤 이벤트 설정
        setupMapControlEvents();

        // 필터 이벤트 설정
        setupFilterEvents();

        // 검색 이벤트 설정
        setupSearchEvents();

        // 로고 클릭 이벤트 설정
        setupLogoClickEvent();

        // 데이터 로드
        await loadCenters();

        // URL 파라미터 처리
        handleUrlParams();

        // 로딩 완료 처리
        hideMapLoading();
        
        console.log('🎉 지도 초기화 완료');

    } catch (error) {
        console.error('❌ 지도 초기화 실패:', error);
        showError('지도 초기화에 실패했습니다');
        hideMapLoading();
    }
};

// 연수원 데이터 로드
const loadCenters = async () => {
    try {
        console.log('📊 연수원 데이터 로드 시작');
        
        let centersData = [];
        
        // Firebase 초기화 시도
        const firebaseModules = await initializeFirebase();
        
        if (firebaseModules && firebaseLoaded) {
            try {
                const { collection, getDocs } = firebaseModules;
                const querySnapshot = await getDocs(collection(db, "trainingCenters"));
                
                querySnapshot.forEach((doc) => {
                    const center = doc.data();
                    center.id = doc.id;
                    centersData.push(center);
                });
                
                console.log(`✅ Firebase에서 ${centersData.length}개 연수원 로드 완료`);
            } catch (firebaseError) {
                console.warn('⚠️ Firebase 데이터 로드 실패, 샘플 데이터 사용:', firebaseError);
                centersData = generateSampleData();
            }
        } else {
            console.log('📋 Firebase 연결 실패, 샘플 데이터 사용');
            centersData = generateSampleData();
        }

        // 마커 생성
        createMarkersFromData(centersData);
        
        // 결과 카운트 업데이트
        updateResultsCount(centersData.length);
        
        console.log(`🎯 총 ${centersData.length}개 연수원 마커 생성 완료`);

    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        
        // 샘플 데이터로 폴백
        const sampleData = generateSampleData();
        createMarkersFromData(sampleData);
        updateResultsCount(sampleData.length);
        
        console.log('📋 샘플 데이터로 복구 완료');
    }
};

// 마커 생성
const createMarkersFromData = (centersData) => {
    try {
        allMarkers = [];
        
        centersData.forEach((center) => {
            if (center.location && center.location.lat && center.location.lng) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    map: null, // 처음에는 지도에 표시하지 않음 (클러스터러가 관리)
                    title: center.name,
                    icon: {
                        content: createMarkerContent(center.name),
                        anchor: new naver.maps.Point(15, 40)
                    }
                });

                // 마커에 데이터 저장
                marker.centerData = center;

                // 마커 클릭 이벤트
                naver.maps.Event.addListener(marker, 'click', function() {
                    const content = createInfoWindowContent(center);
                    infoWindowManager.openInfoWindow(map, marker, content);
                });

                allMarkers.push(marker);
            }
        });

        // 마커 클러스터링 적용
        if (typeof MarkerClustering !== 'undefined') {
            clusterer = new MarkerClustering({
                minClusterSize: 2,
                maxZoom: 13,
                map: map,
                markers: allMarkers,
                disableClickZoom: false,
                gridSize: 120,
                icons: [
                    {
                        content: '<div class="cluster-marker cluster-marker-1">NUMBER_OF_MARKERS</div>',
                        size: new naver.maps.Size(40, 40),
                        anchor: new naver.maps.Point(20, 20),
                    },
                    {
                        content: '<div class="cluster-marker cluster-marker-2">NUMBER_OF_MARKERS</div>',
                        size: new naver.maps.Size(50, 50),
                        anchor: new naver.maps.Point(25, 25),
                    },
                    {
                        content: '<div class="cluster-marker cluster-marker-3">NUMBER_OF_MARKERS</div>',
                        size: new naver.maps.Size(60, 60),
                        anchor: new naver.maps.Point(30, 30),
                    }
                ]
            });
            
            console.log('✅ 마커 클러스터링 적용 완료');
        }

        filteredMarkers = [...allMarkers];
        
    } catch (error) {
        console.error('❌ 마커 생성 실패:', error);
    }
};

// 지도 컨트롤 이벤트 설정
const setupMapControlEvents = () => {
    // 현재 위치 버튼
    const currentLocationBtn = document.getElementById('current-location');
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        map.setCenter(new naver.maps.LatLng(lat, lng));
                        map.setZoom(15);
                        console.log('📍 현재 위치로 이동');
                    },
                    (error) => {
                        console.warn('⚠️ 위치 정보 가져오기 실패:', error);
                        alert('위치 정보를 가져올 수 없습니다.');
                    }
                );
            }
        });
    }

    // 확대 버튼
    const zoomInBtn = document.getElementById('zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            map.setZoom(map.getZoom() + 1);
        });
    }

    // 축소 버튼
    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            map.setZoom(map.getZoom() - 1);
        });
    }

    // 전체보기 버튼
    const resetMapBtn = document.getElementById('reset-map');
    if (resetMapBtn) {
        resetMapBtn.addEventListener('click', () => {
            map.setCenter(new naver.maps.LatLng(36.2253017, 127.6460516));
            map.setZoom(7);
            infoWindowManager.closeCurrentInfoWindow();
            console.log('🏠 지도 초기 위치로 복귀');
        });
    }
};

// 필터 이벤트 설정
const setupFilterEvents = () => {
    const regionFilter = document.getElementById('region-filter');
    const capacityFilter = document.getElementById('capacity-filter');

    if (regionFilter) {
        regionFilter.addEventListener('change', applyFilters);
    }
    
    if (capacityFilter) {
        capacityFilter.addEventListener('change', applyFilters);
    }
};

// 검색 이벤트 설정
const setupSearchEvents = () => {
    const searchInput = document.getElementById('search-input');
    const clearIcon = document.querySelector('.clear-icon');

    if (searchInput) {
        let searchTimeout;
        
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                applyFilters();
            }, 300);
        });
    }

    if (clearIcon) {
        clearIcon.addEventListener('click', function() {
            if (searchInput) {
                searchInput.value = '';
                applyFilters();
            }
        });
    }
};

// 필터 적용
const applyFilters = () => {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const regionFilter = document.getElementById('region-filter')?.value || '';
    const capacityFilter = document.getElementById('capacity-filter')?.value || '';

    filteredMarkers = allMarkers.filter(marker => {
        const center = marker.centerData;
        
        // 검색어 필터
        if (searchTerm) {
            const searchFields = [
                center.name || '',
                center.branch || '',
                center.basicInfo || '',
                center.region || ''
            ].join(' ').toLowerCase();
            
            if (!searchFields.includes(searchTerm)) {
                return false;
            }
        }

        // 지역 필터
        if (regionFilter && center.region !== regionFilter) {
            return false;
        }

        // 수용인원 필터
        if (capacityFilter) {
            const capacity = parseInt(center.capacity) || 0;
            switch (capacityFilter) {
                case '0-50':
                    if (capacity > 50) return false;
                    break;
                case '51-100':
                    if (capacity < 51 || capacity > 100) return false;
                    break;
                case '101-200':
                    if (capacity < 101 || capacity > 200) return false;
                    break;
                case '201+':
                    if (capacity < 201) return false;
                    break;
            }
        }

        return true;
    });

    // 클러스터러 업데이트
    if (clusterer) {
        clusterer.clearMarkers();
        clusterer.setMarkers(filteredMarkers);
    }

    // 결과 카운트 업데이트
    updateResultsCount(filteredMarkers.length);
    
    console.log(`🔎 필터 적용: ${filteredMarkers.length}개 결과`);
};

// 로고 클릭 이벤트 설정
const setupLogoClickEvent = () => {
    const logoLink = document.querySelector('.logo a');
    
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            if (window.location.pathname.endsWith('index.html') || 
                window.location.pathname.endsWith('/')) {
                e.preventDefault();
                
                // 지도 초기 상태로 복귀
                map.setCenter(new naver.maps.LatLng(36.2253017, 127.6460516));
                map.setZoom(7);
                
                // 정보창 닫기
                infoWindowManager.closeCurrentInfoWindow();
                
                // 필터 초기화
                const regionFilter = document.getElementById('region-filter');
                const capacityFilter = document.getElementById('capacity-filter');
                if (regionFilter) regionFilter.value = '';
                if (capacityFilter) capacityFilter.value = '';
                
                // 검색창 초기화
                const searchInput = document.getElementById('search-input');
                if (searchInput) searchInput.value = '';
                
                // 모든 마커 다시 표시
                if (clusterer) {
                    clusterer.clearMarkers();
                    clusterer.setMarkers(allMarkers);
                }
                
                updateResultsCount(allMarkers.length);
                
                console.log('🏠 로고 클릭 - 초기 상태로 복귀');
            }
        });
    }
};

// URL 파라미터 처리
const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const centerId = urlParams.get('center');
    
    if (centerId) {
        setTimeout(() => {
            const targetMarker = allMarkers.find(marker => marker.centerData.id === centerId);
            if (targetMarker) {
                map.setCenter(targetMarker.getPosition());
                map.setZoom(15);
                
                const content = createInfoWindowContent(targetMarker.centerData);
                infoWindowManager.openInfoWindow(map, targetMarker, content);
                
                console.log('🎯 URL 파라미터로 특정 연수원 표시:', targetMarker.getTitle());
            }
        }, 1000);
    }
};

// 로딩 숨김
const hideMapLoading = () => {
    const mapLoading = document.getElementById('map-loading');
    if (mapLoading) {
        mapLoading.style.display = 'none';
    }
    
    // index.html에서 정의된 함수 호출
    if (typeof window.hideMapLoading === 'function') {
        window.hideMapLoading();
    }
    
    console.log('✅ 지도 로딩 완료');
};

// 결과 카운트 업데이트
const updateResultsCount = (count) => {
    if (typeof window.updateResultsCount === 'function') {
        window.updateResultsCount(count);
    }
    
    console.log(`📊 표시 중인 연수원: ${count}개`);
};

// 에러 표시
const showError = (message) => {
    console.error('❌ 에러:', message);
    
    const mapElement = document.getElementById('map');
    if (mapElement) {
        mapElement.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                flex-direction: column;
                background: #f8f9fa;
                color: #666;
                text-align: center;
                padding: 20px;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px; color: #ffc107;"></i>
                <h3 style="margin-bottom: 10px;">오류가 발생했습니다</h3>
                <p style="margin-bottom: 15px;">${message}</p>
                <button onclick="location.reload()" style="
                    padding: 10px 20px;
                    background: #0077cc;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                ">새로고침</button>
            </div>
        `;
    }
};

// 페이지 로드 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM 로드 완료 - 지도 초기화 시작');
    
    // 네이버 지도 API 로드 대기
    const checkNaverMaps = () => {
        if (typeof naver !== 'undefined' && naver.maps) {
            initMap();
        } else {
            setTimeout(checkNaverMaps, 100);
        }
    };
    
    checkNaverMaps();
});

// 디버깅을 위한 전역 함수들
window.debugInfo = {
    getCurrentInfoWindow: () => infoWindowManager?.getCurrentInfoWindow(),
    getCurrentMarker: () => infoWindowManager?.getCurrentMarker(),
    closeInfoWindow: () => infoWindowManager?.closeCurrentInfoWindow(),
    getMarkerCount: () => allMarkers.length,
    getAllMarkers: () => allMarkers,
    getMap: () => map,
    reloadCenters: () => loadCenters(),
    applyFilters: () => applyFilters()
};

// 에러 처리
window.addEventListener('error', (event) => {
    console.error('❌ 전역 에러:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise 에러:', event.reason);
});

console.log('✅ 수정된 app.js 로드 완료');
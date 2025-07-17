// ====== 완전히 개선된 app.js 파일 (모든 문제 해결) ======

// ===== 전역 변수 선언 =====
let map = null;
let db = null;
let allMarkers = [];
let filteredMarkers = [];
let clusterer = null;
let infoWindowManager = null;
let firebaseLoaded = false;
let mapInitialized = false;

// ===== Firebase 초기화 (안전한 에러 처리) =====
async function initializeFirebase() {
    try {
        console.log('🔥 Firebase 초기화 시도...');
        
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
        console.warn('⚠️ Firebase 초기화 실패, 샘플 데이터로 진행:', error);
        firebaseLoaded = false;
        return null;
    }
}

// ===== 정보창 관리자 클래스 =====
class InfoWindowManager {
    constructor() {
        this.currentInfoWindow = null;
        this.currentMarker = null;
        this.setupEventDelegation();
        console.log('✅ 정보창 관리자 초기화 완료');
    }

    setupEventDelegation() {
        // 이벤트 위임으로 닫기 버튼 처리
        document.addEventListener('click', (event) => {
            const closeBtn = event.target.closest('.info-window-close');
            if (closeBtn) {
                event.preventDefault();
                event.stopPropagation();
                this.closeCurrentInfoWindow();
                console.log('🔽 정보창 닫힘');
            }
        });

        // ESC 키로 정보창 닫기
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeCurrentInfoWindow();
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

// ===== 마커 아이콘 HTML 생성 함수 =====
const createMarkerContent = (name) => {
    const truncatedName = name.length > 10 ? name.substring(0, 10) + '...' : name;
    
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
                <span class="marker-text">${truncatedName}</span>
            </div>
            <div class="marker-pointer"></div>
        </div>
    `;
};

// ===== 정보창 내용 HTML 생성 함수 =====
const createInfoWindowContent = (center) => {
    // 주소 정보
    const addressHtml = center.address ? 
        `<div class="info-window-info">
            <i class="fas fa-map-marker-alt" style="color: #0077cc; margin-right: 6px;"></i> 
            ${center.address}
        </div>` : '';
    
    // 기본 정보
    const basicInfoHtml = center.basicInfo ?
        `<div class="info-window-info" style="margin-top: 8px;">
            ${center.basicInfo.length > 100 ? center.basicInfo.substring(0, 100) + '...' : center.basicInfo}
        </div>` : '';
    
    // 버튼들
    let buttonsHtml = '';
    
    if (center.links?.naver) {
        buttonsHtml += `
            <a href="${center.links.naver}" target="_blank" rel="noopener noreferrer" class="directions-button">
                <i class="fas fa-directions"></i> 길찾기
            </a>
        `;
    }
    
    if (center.links?.website) {
        buttonsHtml += `
            <a href="${center.links.website}" target="_blank" rel="noopener noreferrer" class="search-button">
                <i class="fas fa-external-link-alt"></i> 웹사이트
            </a>
        `;
    }

    // 추가 정보 태그
    let tagsHtml = '';
    if (center.capacity) {
        tagsHtml += `<span class="info-tag"><i class="fas fa-users"></i> ${center.capacity}명</span>`;
    }
    if (center.region) {
        tagsHtml += `<span class="info-tag"><i class="fas fa-map"></i> ${center.region}</span>`;
    }

    return `
        <div class="info-window">
            <div class="info-window-header">
                <div>
                    <h3 class="info-window-title">${center.name}</h3>
                    ${center.branch ? `<div class="info-window-branch">${center.branch}</div>` : ''}
                </div>
                <button class="info-window-close" aria-label="정보창 닫기">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            ${addressHtml}
            ${basicInfoHtml}
            
            ${tagsHtml ? `<div class="info-window-tags">${tagsHtml}</div>` : ''}
            
            ${buttonsHtml ? `<div class="info-window-buttons">${buttonsHtml}</div>` : ''}
        </div>
    `;
};

// ===== 샘플 데이터 생성 =====
const generateSampleData = () => {
    console.log('📋 샘플 데이터 생성');
    
    return [
        {
            id: 'sample1',
            name: '서울교육연수원',
            branch: '강남지점',
            basicInfo: '최신 시설을 갖춘 교육전문 연수원입니다. 다양한 교육 프로그램과 편의시설을 제공하며, 지하철 2호선 강남역에서 도보 5분 거리에 위치해 있습니다.',
            region: '서울',
            capacity: 150,
            address: '서울특별시 강남구 테헤란로 123',
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
            basicInfo: '자연 친화적 환경의 대규모 연수시설입니다. 숙박시설과 체육시설이 완비되어 있으며, 단체 연수에 최적화된 시설을 보유하고 있습니다.',
            region: '경기',
            capacity: 300,
            address: '경기도 수원시 영통구 월드컵로 456',
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
            basicInfo: '바다가 보이는 아름다운 연수원입니다. 해양스포츠와 연계한 특별 프로그램을 운영하며, 휴양과 교육을 함께 할 수 있는 최고의 환경을 제공합니다.',
            region: '부산',
            capacity: 200,
            address: '부산광역시 해운대구 해운대해변로 789',
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
            basicInfo: '과학도시 대전의 첨단 교육시설입니다. IT 교육에 특화된 장비와 시설을 보유하고 있으며, 연구개발 관련 교육 프로그램을 제공합니다.',
            region: '대전',
            capacity: 120,
            address: '대전광역시 유성구 대학로 321',
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
            basicInfo: '아름다운 제주도의 자연 속에서 진행되는 특별한 연수 경험을 제공합니다. 제주의 청정 자연환경과 함께하는 힐링 연수 프로그램이 특징입니다.',
            region: '제주',
            capacity: 80,
            address: '제주특별자치도 제주시 첨단로 654',
            location: { lat: 33.4996, lng: 126.5312 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample6',
            name: '강원연수원',
            branch: '춘천지점',
            basicInfo: '청정 강원도의 자연 속에서 운영되는 연수원입니다. 산과 호수가 어우러진 환경에서 심신을 재충전할 수 있습니다.',
            region: '강원',
            capacity: 180,
            address: '강원도 춘천시 의암대로 789',
            location: { lat: 37.8813, lng: 127.7298 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample7',
            name: '전남연수원',
            branch: '순천지점',
            basicInfo: '남도의 정취를 느낄 수 있는 전통과 현대가 조화된 연수원입니다. 순천만 국가정원과 인접해 있습니다.',
            region: '전라',
            capacity: 160,
            address: '전라남도 순천시 순천만길 123',
            location: { lat: 34.9506, lng: 127.4872 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample8',
            name: '경북연수원',
            branch: '경주지점',
            basicInfo: '천년 고도 경주의 역사적 배경 속에서 운영되는 연수원입니다. 문화유적지 견학과 연계한 특별 프로그램을 제공합니다.',
            region: '경상',
            capacity: 140,
            address: '경상북도 경주시 첨성로 456',
            location: { lat: 35.8562, lng: 129.2247 },
            links: { 
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        }
    ];
};

// ===== 지도 초기화 함수 =====
const initMap = async () => {
    try {
        console.log('🗺️ 지도 초기화 시작');
        showLoadingMessage('지도를 초기화하는 중...');
        
        // 네이버 지도 API 로드 확인
        if (typeof naver === 'undefined' || !naver.maps) {
            throw new Error('네이버 지도 API가 로드되지 않았습니다');
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
            },
            scaleControl: true,
            logoControl: true,
            mapDataControl: true
        });

        console.log('✅ 지도 생성 완료');

        // 정보창 관리자 초기화
        infoWindowManager = new InfoWindowManager();

        // 이벤트 리스너 설정
        setupMapControlEvents();
        setupFilterEvents();
        setupSearchEvents();
        setupLogoClickEvent();

        // 연수원 데이터 로드
        showLoadingMessage('연수원 데이터를 불러오는 중...');
        await loadCenters();

        // URL 파라미터 처리
        handleUrlParams();

        // 초기화 완료
        mapInitialized = true;
        hideMapLoading();
        
        console.log('🎉 지도 초기화 완료');

    } catch (error) {
        console.error('❌ 지도 초기화 실패:', error);
        showError(`지도 초기화에 실패했습니다: ${error.message}`);
        hideMapLoading();
    }
};

// ===== 연수원 데이터 로드 =====
const loadCenters = async () => {
    try {
        console.log('📊 연수원 데이터 로드 시작');
        
        let centersData = [];
        
        // Firebase 초기화 시도
        const firebaseModules = await initializeFirebase();
        
        if (firebaseModules && firebaseLoaded) {
            try {
                showLoadingMessage('Firebase에서 데이터를 가져오는 중...');
                
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

        // 데이터 검증
        if (!Array.isArray(centersData) || centersData.length === 0) {
            throw new Error('연수원 데이터가 없습니다');
        }

        // 마커 생성
        showLoadingMessage('지도에 연수원을 표시하는 중...');
        await createMarkersFromData(centersData);
        
        // 결과 카운트 업데이트
        updateResultsCount(centersData.length);
        
        console.log(`🎯 총 ${centersData.length}개 연수원 마커 생성 완료`);

    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        
        // 최후의 방법: 샘플 데이터로 복구
        try {
            const sampleData = generateSampleData();
            await createMarkersFromData(sampleData);
            updateResultsCount(sampleData.length);
            console.log('📋 샘플 데이터로 복구 완료');
        } catch (sampleError) {
            console.error('❌ 샘플 데이터 복구도 실패:', sampleError);
            showError('연수원 데이터를 불러올 수 없습니다. 페이지를 새로고침해주세요.');
        }
    }
};

// ===== 마커 생성 =====
const createMarkersFromData = async (centersData) => {
    try {
        allMarkers = [];
        
        // 마커 생성
        centersData.forEach((center, index) => {
            if (center.location && center.location.lat && center.location.lng) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    map: null, // 클러스터러가 관리
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
            } else {
                console.warn('⚠️ 유효하지 않은 위치 데이터:', center);
            }
        });

        console.log(`📍 ${allMarkers.length}개 마커 생성 완료`);

        // 마커 클러스터링 적용
        await applyMarkerClustering();

        filteredMarkers = [...allMarkers];
        
    } catch (error) {
        console.error('❌ 마커 생성 실패:', error);
        throw error;
    }
};

// ===== 마커 클러스터링 적용 =====
const applyMarkerClustering = async () => {
    try {
        if (typeof MarkerClustering !== 'undefined' && allMarkers.length > 0) {
            console.log('🔗 마커 클러스터링 적용 중...');
            
            // 클러스터 옵션 생성 함수
            const createClusterIcon = (count) => {
                let className = 'cluster-marker-1';
                let size = 40;
                
                if (count >= 50) {
                    className = 'cluster-marker-5';
                    size = 80;
                } else if (count >= 20) {
                    className = 'cluster-marker-4';
                    size = 70;
                } else if (count >= 10) {
                    className = 'cluster-marker-3';
                    size = 60;
                } else if (count >= 5) {
                    className = 'cluster-marker-2';
                    size = 50;
                }
                
                return {
                    content: `<div class="cluster-marker ${className}">${count}</div>`,
                    size: new naver.maps.Size(size, size),
                    anchor: new naver.maps.Point(size/2, size/2)
                };
            };

            clusterer = new MarkerClustering({
                minClusterSize: 2,
                maxZoom: 13,
                map: map,
                markers: allMarkers,
                disableClickZoom: false,
                gridSize: 120,
                icons: [
                    createClusterIcon(2),
                    createClusterIcon(5),
                    createClusterIcon(10),
                    createClusterIcon(20),
                    createClusterIcon(50)
                ],
                indexGenerator: [2, 5, 10, 20, 50],
                stylingFunction: function(clusterMarker, count) {
                    return createClusterIcon(count);
                }
            });
            
            console.log('✅ 마커 클러스터링 적용 완료');
            
        } else {
            console.warn('⚠️ MarkerClustering 라이브러리 없음, 개별 마커 표시');
            
            // 클러스터링 없이 개별 마커 표시
            allMarkers.forEach(marker => {
                marker.setMap(map);
            });
        }
        
    } catch (error) {
        console.error('❌ 클러스터링 적용 실패:', error);
        
        // 폴백: 개별 마커 표시
        allMarkers.forEach(marker => {
            try {
                marker.setMap(map);
            } catch (markerError) {
                console.warn('⚠️ 마커 표시 실패:', markerError);
            }
        });
    }
};

// ===== 지도 컨트롤 이벤트 설정 =====
const setupMapControlEvents = () => {
    // 현재 위치 버튼
    const currentLocationBtn = document.getElementById('current-location');
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                currentLocationBtn.disabled = true;
                currentLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        map.setCenter(new naver.maps.LatLng(lat, lng));
                        map.setZoom(15);
                        
                        // 현재 위치 마커 표시
                        new naver.maps.Marker({
                            position: new naver.maps.LatLng(lat, lng),
                            map: map,
                            icon: {
                                content: '<div style="background: #ff4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>',
                                anchor: new naver.maps.Point(6, 6)
                            }
                        });
                        
                        console.log('📍 현재 위치로 이동');
                        
                        currentLocationBtn.disabled = false;
                        currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    },
                    (error) => {
                        console.warn('⚠️ 위치 정보 가져오기 실패:', error);
                        alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
                        
                        currentLocationBtn.disabled = false;
                        currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    },
                    {
                        timeout: 10000,
                        enableHighAccuracy: true
                    }
                );
            } else {
                alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
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
            resetAllFilters();
            console.log('🏠 지도 초기 위치로 복귀');
        });
    }
};

// ===== 필터 이벤트 설정 =====
const setupFilterEvents = () => {
    const regionFilter = document.getElementById('region-filter');
    const capacityFilter = document.getElementById('capacity-filter');

    if (regionFilter) {
        regionFilter.addEventListener('change', applyFilters);
    }
    
    if (capacityFilter) {
        capacityFilter.addEventListener('change', applyFilters);
    }

    // 필터 토글 버튼
    const filterToggle = document.querySelector('.filter-toggle');
    const filterOptions = document.querySelector('.filter-options');
    
    if (filterToggle && filterOptions) {
        filterToggle.addEventListener('click', function() {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            this.setAttribute('aria-expanded', !isExpanded);
            filterOptions.classList.toggle('show');
            this.classList.toggle('active');
        });

        // 필터 외부 클릭 시 닫기
        document.addEventListener('click', function(e) {
            if (!filterToggle.contains(e.target) && !filterOptions.contains(e.target)) {
                filterOptions.classList.remove('show');
                filterToggle.classList.remove('active');
                filterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
};

// ===== 검색 이벤트 설정 =====
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

    // 검색 결과 표시 함수
    function showSearchResults(query) {
        if (!searchResults || !allMarkers.length) return;
        
        const matches = allMarkers.filter(marker => {
            const center = marker.centerData;
            const searchFields = [
                center.name || '',
                center.branch || '',
                center.basicInfo || '',
                center.region || ''
            ].join(' ').toLowerCase();
            
            return searchFields.includes(query.toLowerCase());
        }).slice(0, 5); // 최대 5개만 표시

        if (matches.length > 0) {
            const resultsHtml = matches.map(marker => {
                const center = marker.centerData;
                return `
                    <div class="search-result-item" data-center-id="${center.id}">
                        <div class="search-result-name">${center.name}</div>
                        <div class="search-result-info">${center.branch || ''} ${center.region ? '• ' + center.region : ''}</div>
                    </div>
                `;
            }).join('');

            searchResults.innerHTML = resultsHtml;
            searchResults.style.display = 'block';

            // 검색 결과 클릭 이벤트
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', function() {
                    const centerId = this.dataset.centerId;
                    const targetMarker = allMarkers.find(marker => marker.centerData.id === centerId);
                    
                    if (targetMarker) {
                        map.setCenter(targetMarker.getPosition());
                        map.setZoom(15);
                        
                        const content = createInfoWindowContent(targetMarker.centerData);
                        infoWindowManager.openInfoWindow(map, targetMarker, content);
                        
                        hideSearchResults();
                        if (searchInput) searchInput.blur();
                    }
                });
            });
        } else {
            searchResults.innerHTML = '<div class="search-result-item">검색 결과가 없습니다</div>';
            searchResults.style.display = 'block';
        }
    }

    // 검색 결과 숨김 함수
    function hideSearchResults() {
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
};

// ===== 필터 적용 =====
const applyFilters = () => {
    if (!allMarkers.length) return;
    
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
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
        if (filteredMarkers.length > 0) {
            clusterer.setMarkers(filteredMarkers);
        }
    }

    // 결과 카운트 업데이트
    updateResultsCount(filteredMarkers.length);
    
    console.log(`🔎 필터 적용: ${filteredMarkers.length}개 결과`);
};

// ===== 모든 필터 초기화 =====
const resetAllFilters = () => {
    // 필터 초기화
    const regionFilter = document.getElementById('region-filter');
    const capacityFilter = document.getElementById('capacity-filter');
    const searchInput = document.getElementById('search-input');
    const clearIcon = document.querySelector('.clear-icon');
    const searchResults = document.querySelector('.search-results');
    
    if (regionFilter) regionFilter.value = '';
    if (capacityFilter) capacityFilter.value = '';
    if (searchInput) searchInput.value = '';
    if (clearIcon) clearIcon.style.display = 'none';
    if (searchResults) searchResults.style.display = 'none';
    
    // 모든 마커 다시 표시
    if (clusterer && allMarkers.length > 0) {
        clusterer.clearMarkers();
        clusterer.setMarkers(allMarkers);
    }
    
    filteredMarkers = [...allMarkers];
    updateResultsCount(allMarkers.length);
    
    console.log('🔄 모든 필터 초기화');
};

// ===== 로고 클릭 이벤트 설정 =====
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
                
                // 모든 필터 초기화
                resetAllFilters();
                
                console.log('🏠 로고 클릭 - 초기 상태로 복귀');
            }
        });
    }
};

// ===== URL 파라미터 처리 =====
const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const centerId = urlParams.get('center');
    
    if (centerId && allMarkers.length > 0) {
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

// ===== 로딩 메시지 표시 =====
const showLoadingMessage = (message) => {
    const mapLoading = document.getElementById('map-loading');
    if (mapLoading) {
        const messageElement = mapLoading.querySelector('p');
        if (messageElement) {
            messageElement.textContent = message;
        }
        mapLoading.style.display = 'block';
    }
};

// ===== 로딩 숨김 =====
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

// ===== 결과 카운트 업데이트 =====
const updateResultsCount = (count) => {
    // index.html에서 정의된 함수 호출
    if (typeof window.updateResultsCount === 'function') {
        window.updateResultsCount(count);
    }
    
    // 표시 중인 카운트 업데이트
    const visibleCountElements = document.querySelectorAll('#visible-count, #current-count');
    visibleCountElements.forEach(element => {
        if (element) {
            element.textContent = count.toLocaleString();
        }
    });
    
    console.log(`📊 표시 중인 연수원: ${count}개`);
};

// ===== 에러 표시 =====
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
                font-family: 'Noto Sans KR', sans-serif;
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 15px; color: #ffc107;"></i>
                <h3 style="margin: 0 0 10px 0; color: #333;">오류가 발생했습니다</h3>
                <p style="margin: 0 0 20px 0; line-height: 1.5;">${message}</p>
                <button onclick="location.reload()" style="
                    padding: 12px 24px;
                    background: #0077cc;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: background-color 0.3s;
                " onmouseover="this.style.background='#0066b3'" onmouseout="this.style.background='#0077cc'">
                    <i class="fas fa-redo" style="margin-right: 6px;"></i>새로고침
                </button>
            </div>
        `;
    }
};

// ===== 페이지 로드 후 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM 로드 완료 - 지도 초기화 준비');
    
    // 네이버 지도 API 로드 대기
    const checkNaverMaps = (attempts = 0) => {
        if (typeof naver !== 'undefined' && naver.maps) {
            console.log('✅ 네이버 지도 API 로드 완료');
            initMap();
        } else if (attempts < 50) { // 5초간 대기
            setTimeout(() => checkNaverMaps(attempts + 1), 100);
        } else {
            console.error('❌ 네이버 지도 API 로드 타임아웃');
            showError('지도 API 로드에 실패했습니다. 네트워크 연결을 확인하고 새로고침해주세요.');
            hideMapLoading();
        }
    };
    
    checkNaverMaps();
});

// ===== 디버깅을 위한 전역 함수들 =====
window.debugInfo = {
    getCurrentInfoWindow: () => infoWindowManager?.getCurrentInfoWindow(),
    getCurrentMarker: () => infoWindowManager?.getCurrentMarker(),
    closeInfoWindow: () => infoWindowManager?.closeCurrentInfoWindow(),
    getMarkerCount: () => allMarkers.length,
    getFilteredMarkerCount: () => filteredMarkers.length,
    getAllMarkers: () => allMarkers,
    getFilteredMarkers: () => filteredMarkers,
    getMap: () => map,
    isMapInitialized: () => mapInitialized,
    isFirebaseLoaded: () => firebaseLoaded,
    reloadCenters: () => loadCenters(),
    applyFilters: () => applyFilters(),
    resetFilters: () => resetAllFilters(),
    showSampleData: () => generateSampleData()
};

// ===== 전역 에러 처리 =====
window.addEventListener('error', (event) => {
    console.error('❌ 전역 에러:', event.error);
    
    if (!mapInitialized) {
        showError(`스크립트 오류가 발생했습니다: ${event.error?.message || '알 수 없는 오류'}`);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Promise 에러:', event.reason);
    
    if (!mapInitialized) {
        showError(`비동기 처리 중 오류가 발생했습니다: ${event.reason?.message || '알 수 없는 오류'}`);
    }
});

// ===== 브라우저 호환성 체크 =====
(() => {
    const requiredFeatures = [
        'Promise',
        'fetch',
        'Map',
        'Set',
        'addEventListener'
    ];
    
    const missingFeatures = requiredFeatures.filter(feature => typeof window[feature] === 'undefined');
    
    if (missingFeatures.length > 0) {
        console.error('❌ 브라우저 호환성 문제:', missingFeatures);
        showError(`이 브라우저는 일부 기능을 지원하지 않습니다. 최신 브라우저를 사용해주세요.\n누락된 기능: ${missingFeatures.join(', ')}`);
    }
})();

console.log('✅ 완전히 개선된 app.js 로드 완료 - 모든 문제 해결됨');
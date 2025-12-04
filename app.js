// ====== 완전히 개선된 app.js 파일 (모든 문제 해결) ======

// ===== Firebase 공통 설정 import =====
import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION, getFirebaseUrl, COLLECTIONS } from './firebase-config.js';

// ===== 전역 변수 선언 =====
let map = null;
let db = null;
let allMarkers = [];
let filteredMarkers = [];
let clusterer = null;
let infoWindowManager = null;
let firebaseLoaded = false;
let mapInitialized = false;

// ===== 토스트 알림 관리자 =====
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

    show(message, type = 'info', title = null, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const titles = {
            success: title || '성공',
            error: title || '오류',
            warning: title || '주의',
            info: title || '알림'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon" aria-hidden="true"></i>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="알림 닫기">
                <i class="fas fa-times"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        this.container.appendChild(toast);

        // 자동 제거
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        console.log(`📢 토스트 알림 [${type}]: ${message}`);
        return toast;
    }

    remove(toast) {
        toast.classList.add('closing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    success(message, title = null, duration = 5000) {
        return this.show(message, 'success', title, duration);
    }

    error(message, title = null, duration = 7000) {
        return this.show(message, 'error', title, duration);
    }

    warning(message, title = null, duration = 6000) {
        return this.show(message, 'warning', title, duration);
    }

    info(message, title = null, duration = 5000) {
        return this.show(message, 'info', title, duration);
    }
}

// 전역 토스트 매니저 인스턴스
const toast = new ToastManager();

// ===== Firebase 초기화 (안전한 에러 처리) =====
async function initializeFirebase() {
    try {
        console.log('🔥 Firebase 초기화 시도... (공통 설정 사용)');

        // 공통 설정에서 가져온 URL 사용
        const { initializeApp } = await import(getFirebaseUrl('app'));
        const { getFirestore, collection, getDocs, addDoc } = await import(getFirebaseUrl('firestore'));

        // 공통 설정 사용 (firebase-config.js)
        const app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);
        firebaseLoaded = true;

        // 전역으로 노출
        window.firebase = { db, collection, getDocs, addDoc };

        console.log('✅ Firebase 초기화 성공 (SDK v' + FIREBASE_SDK_VERSION + ')');
        return { db, collection, getDocs, addDoc };

    } catch (error) {
        console.warn('⚠️ Firebase 초기화 실패, 샘플 데이터로 진행:', error);
        firebaseLoaded = false;
        toast.warning('실시간 데이터 연결에 실패했습니다. 샘플 데이터를 표시합니다.', 'Firebase 연결 실패', 8000);
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

            // InfoWindow가 열린 후 닫기 버튼에 이벤트 바인딩
            setTimeout(() => {
                const closeBtn = document.querySelector('.info-window-close');
                if (closeBtn) {
                    closeBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.closeCurrentInfoWindow();
                        console.log('🔽 정보창 닫힘 (X 버튼)');
                    };
                }
            }, 100);

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

    // 즐겨찾기 버튼 추가
    const isFavorite = favoritesManager.has(center.id);
    buttonsHtml += `
        <button class="favorite-button ${isFavorite ? 'active' : ''}"
                data-center-id="${center.id}"
                onclick="toggleFavorite('${center.id}')"
                aria-label="${isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}">
            <i class="fas fa-star"></i>
        </button>
    `;

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

    // 공유 버튼 추가
    buttonsHtml += `
        <button class="share-button search-button" data-center-id="${center.id}" onclick="shareCenter('${center.id}')">
            <i class="fas fa-share-alt"></i> 공유
        </button>
    `;

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

        // 지도 생성 (부드러운 애니메이션 설정)
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
            mapDataControl: true,
            // 부드러운 애니메이션 설정
            tileTransition: true,
            tileDuration: 200,
            zoomOrigin: null,
            pinchZoom: true,
            scrollWheel: true,
            keyboardShortcuts: true,
            draggable: true,
            disableKineticPan: false,
            tileSpare: 2,
            // 성능 최적화
            useStyleMap: true,
            blankTileImage: null,
            // 부드러운 확대/축소를 위한 설정
            zoomControlOptions: {
                position: naver.maps.Position.TOP_RIGHT,
                style: naver.maps.ZoomControlStyle.SMALL
            }
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

        // 즐겨찾기 카운트 초기화
        updateFavoritesCount();

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
                toast.success(`${centersData.length}개의 연수원 정보를 불러왔습니다.`, '데이터 로드 완료', 4000);

            } catch (firebaseError) {
                console.warn('⚠️ Firebase 데이터 로드 실패, 샘플 데이터 사용:', firebaseError);
                centersData = generateSampleData();
                toast.warning('데이터 로드 실패. 샘플 데이터를 표시합니다.', 'Firebase 오류', 6000);
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

            clusterer = new MarkerClustering({
                minClusterSize: 2,
                maxZoom: 13,
                map: map,
                markers: allMarkers,
                disableClickZoom: false,
                gridSize: 120,
                icons: [
                    {
                        content: '<div class="cluster-marker cluster-marker-1">0</div>',
                        size: new naver.maps.Size(40, 40),
                        anchor: new naver.maps.Point(20, 20)
                    }
                ],
                indexGenerator: [10, 100, 200, 500, 1000],
                stylingFunction: function(clusterMarker, count) {
                    // 클러스터 크기별 클래스 및 사이즈 결정
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

                    // DOM 직접 업데이트로 실제 count 표시
                    const element = clusterMarker.getElement();
                    if (element) {
                        element.innerHTML = `<div class="cluster-marker ${className}">${count}</div>`;
                        element.style.width = size + 'px';
                        element.style.height = size + 'px';
                    }

                    console.log(`📍 클러스터 생성: ${count}개 마커`);
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
                        const currentPos = new naver.maps.LatLng(lat, lng);
                        
                        // 부드러운 애니메이션으로 이동
                        map.morph(currentPos, 15, {
                            duration: 1000,
                            easing: 'easeInOutCubic'
                        });
                        
                        // 애니메이션 완료 후 마커 표시
                        setTimeout(() => {
                            new naver.maps.Marker({
                                position: currentPos,
                                map: map,
                                icon: {
                                    content: '<div style="background: #ff4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>',
                                    anchor: new naver.maps.Point(6, 6)
                                }
                            });
                        }, 1000);
                        
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
            const currentZoom = map.getZoom();
            const newZoom = Math.min(currentZoom + 1, 21); // 최대 줌 레벨 제한
            
            // 부드러운 애니메이션으로 확대
            map.morph(map.getCenter(), newZoom, {
                duration: 300,
                easing: 'easeOutCubic'
            });
        });
    }

    // 축소 버튼
    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            const currentZoom = map.getZoom();
            const newZoom = Math.max(currentZoom - 1, 1); // 최소 줌 레벨 제한
            
            // 부드러운 애니메이션으로 축소
            map.morph(map.getCenter(), newZoom, {
                duration: 300,
                easing: 'easeOutCubic'
            });
        });
    }

    // 전체보기 버튼
    const resetMapBtn = document.getElementById('reset-map');
    if (resetMapBtn) {
        resetMapBtn.addEventListener('click', () => {
            // 부드러운 애니메이션으로 초기 위치 복귀
            map.morph(new naver.maps.LatLng(36.2253017, 127.6460516), 7, {
                duration: 800,
                easing: 'easeInOutCubic'
            });
            
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

    // 관련성 점수 계산 함수
    function calculateRelevance(center, query) {
        const lowerQuery = query.toLowerCase();
        let score = 0;

        // 이름에 정확히 일치 (가장 높은 점수)
        if (center.name && center.name.toLowerCase() === lowerQuery) {
            score += 100;
        }
        // 이름에 시작 (높은 점수)
        else if (center.name && center.name.toLowerCase().startsWith(lowerQuery)) {
            score += 50;
        }
        // 이름에 포함 (중간 점수)
        else if (center.name && center.name.toLowerCase().includes(lowerQuery)) {
            score += 30;
        }

        // 지점명에 일치
        if (center.branch && center.branch.toLowerCase().includes(lowerQuery)) {
            score += 20;
        }

        // 지역에 일치
        if (center.region && center.region.toLowerCase().includes(lowerQuery)) {
            score += 15;
        }

        // 기본 정보에 일치
        if (center.basicInfo && center.basicInfo.toLowerCase().includes(lowerQuery)) {
            score += 5;
        }

        return score;
    }

    // 텍스트 하이라이트 함수
    function highlightText(text, query) {
        if (!text || !query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 2px 4px; border-radius: 2px; font-weight: 500;">$1</mark>');
    }

    // 검색 결과 표시 함수
    function showSearchResults(query) {
        if (!searchResults || !allMarkers.length) return;

        // 관련성 점수 계산 및 필터링
        const matches = allMarkers
            .map(marker => ({
                marker,
                score: calculateRelevance(marker.centerData, query)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score) // 점수 내림차순 정렬
            .slice(0, 5) // 최대 5개만 표시
            .map(item => item.marker);

        if (matches.length > 0) {
            const resultsHtml = matches.map(marker => {
                const center = marker.centerData;
                const highlightedName = highlightText(center.name, query);
                const highlightedBranch = center.branch ? highlightText(center.branch, query) : '';
                const highlightedRegion = center.region ? highlightText(center.region, query) : '';

                return `
                    <div class="search-result-item" data-center-id="${center.id}">
                        <div class="search-result-name">${highlightedName}</div>
                        <div class="search-result-info">${highlightedBranch}${highlightedBranch && highlightedRegion ? ' • ' : ''}${highlightedRegion}</div>
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
                        // 부드러운 애니메이션으로 이동
                        map.morph(targetMarker.getPosition(), 15, {
                            duration: 800,
                            easing: 'easeInOutCubic'
                        });
                        
                        // 애니메이션 완료 후 정보창 열기
                        setTimeout(() => {
                            const content = createInfoWindowContent(targetMarker.centerData);
                            infoWindowManager.openInfoWindow(map, targetMarker, content);
                        }, 800);
                        
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

        // 즐겨찾기 필터
        if (showOnlyFavorites && !favoritesManager.has(center.id)) {
            return false;
        }

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
                
                // 지도 초기 상태로 복귀 (부드러운 애니메이션)
                map.morph(new naver.maps.LatLng(36.2253017, 127.6460516), 7, {
                    duration: 800,
                    easing: 'easeInOutCubic'
                });
                
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
                // 부드러운 애니메이션으로 이동
                map.morph(targetMarker.getPosition(), 15, {
                    duration: 1200,
                    easing: 'easeInOutCubic'
                });
                
                // 애니메이션 완료 후 정보창 열기
                setTimeout(() => {
                    const content = createInfoWindowContent(targetMarker.centerData);
                    infoWindowManager.openInfoWindow(map, targetMarker, content);
                }, 1200);
                
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

// ===== 공유 기능 =====
async function shareCenter(centerId) {
    try {
        const marker = allMarkers.find(m => m.centerData.id === centerId);
        if (!marker) {
            toast.error('연수원 정보를 찾을 수 없습니다.', '공유 실패');
            return;
        }

        const center = marker.centerData;
        const shareUrl = `${window.location.origin}${window.location.pathname}?center=${centerId}`;
        const shareData = {
            title: `${center.name} - 연수원 여기어때`,
            text: `${center.name}${center.branch ? ' (' + center.branch + ')' : ''} - ${center.address || '위치 정보'}`,
            url: shareUrl
        };

        // Web Share API 지원 여부 확인
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast.success('공유가 완료되었습니다!', '공유 성공', 3000);
            console.log('✅ 공유 성공:', shareData);
        } else {
            // 폴백: 클립보드에 복사
            await navigator.clipboard.writeText(shareUrl);
            toast.success('링크가 클립보드에 복사되었습니다!', '링크 복사', 4000);
            console.log('📋 클립보드 복사:', shareUrl);
        }
    } catch (error) {
        console.error('❌ 공유 실패:', error);

        // 공유 실패 시 클립보드 복사 시도
        try {
            const marker = allMarkers.find(m => m.centerData.id === centerId);
            if (marker) {
                const shareUrl = `${window.location.origin}${window.location.pathname}?center=${centerId}`;
                await navigator.clipboard.writeText(shareUrl);
                toast.info('링크가 클립보드에 복사되었습니다.', '링크 복사', 4000);
            }
        } catch (clipboardError) {
            toast.error('공유에 실패했습니다. 다시 시도해주세요.', '공유 실패');
        }
    }
}

// 전역에 노출
window.shareCenter = shareCenter;

// ===== 즐겨찾기 토글 함수 =====
function toggleFavorite(centerId) {
    const result = favoritesManager.toggle(centerId);

    // 정보창 내 버튼 상태 업데이트
    const favoriteBtn = document.querySelector(`.favorite-button[data-center-id="${centerId}"]`);
    if (favoriteBtn) {
        const isFavorite = favoritesManager.has(centerId);
        favoriteBtn.classList.toggle('active', isFavorite);
        favoriteBtn.setAttribute('aria-label', isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가');
    }

    // 즐겨찾기 필터가 활성화되어 있으면 필터 다시 적용
    const favoritesFilter = document.getElementById('favorites-filter');
    if (favoritesFilter && favoritesFilter.classList.contains('active')) {
        applyFilters();
    }

    // 즐겨찾기 카운트 업데이트
    updateFavoritesCount();

    return result;
}

// 전역에 노출
window.toggleFavorite = toggleFavorite;

// ===== 즐겨찾기 필터 토글 =====
let showOnlyFavorites = false;

function toggleFavoritesFilter() {
    showOnlyFavorites = !showOnlyFavorites;

    const favoritesFilter = document.getElementById('favorites-filter');
    if (favoritesFilter) {
        favoritesFilter.classList.toggle('active', showOnlyFavorites);

        const icon = favoritesFilter.querySelector('i');
        const text = favoritesFilter.querySelector('span');
        if (icon && text) {
            icon.className = showOnlyFavorites ? 'fas fa-star' : 'far fa-star';
            text.textContent = showOnlyFavorites ? '전체 보기' : '즐겨찾기';
        }
    }

    applyFilters();

    if (showOnlyFavorites) {
        const count = favoritesManager.getAll().length;
        toast.info(`즐겨찾기 ${count}개를 표시합니다.`, '즐겨찾기 필터', 3000);
    }
}

window.toggleFavoritesFilter = toggleFavoritesFilter;

// ===== 즐겨찾기 카운트 업데이트 =====
function updateFavoritesCount() {
    const countElement = document.getElementById('favorites-count');
    if (countElement) {
        const count = favoritesManager.getAll().length;
        countElement.textContent = count;
        countElement.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

// ===== 즐겨찾기 관리자 =====
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
            return false;
        }
    }

    add(centerId) {
        if (!this.favorites.includes(centerId)) {
            this.favorites.push(centerId);
            if (this.save()) {
                toast.success('즐겨찾기에 추가되었습니다!', '즐겨찾기', 3000);
                console.log('⭐ 즐겨찾기 추가:', centerId);
                return true;
            }
        }
        return false;
    }

    remove(centerId) {
        const index = this.favorites.indexOf(centerId);
        if (index > -1) {
            this.favorites.splice(index, 1);
            if (this.save()) {
                toast.info('즐겨찾기에서 제거되었습니다.', '즐겨찾기', 3000);
                console.log('⭐ 즐겨찾기 제거:', centerId);
                return true;
            }
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
        toast.info('모든 즐겨찾기가 제거되었습니다.', '즐겨찾기', 3000);
    }
}

// 전역 즐겨찾기 매니저
const favoritesManager = new FavoritesManager();
window.favoritesManager = favoritesManager;

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
    showSampleData: () => generateSampleData(),
    getFavorites: () => favoritesManager.getAll()
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
// ==================== 연수원 추가 기능 ====================
let addCenterModal = null;
let addCenterForm = null;

// 모달 초기화
function initAddCenterModal() {
    addCenterModal = document.getElementById('add-center-modal');
    addCenterForm = document.getElementById('add-center-form');
    const addCenterBtn = document.getElementById('add-center-btn');
    const modalClose = addCenterModal?.querySelector('.modal-close');
    const cancelBtn = document.getElementById('cancel-btn');

    if (!addCenterModal || !addCenterForm) {
        console.warn('⚠️ 연수원 추가 모달이 없습니다');
        return;
    }

    // 모달 열기
    addCenterBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        openAddCenterModal();
    });

    // 모달 닫기 (X 버튼)
    modalClose?.addEventListener('click', closeAddCenterModal);

    // 모달 닫기 (취소 버튼)
    cancelBtn?.addEventListener('click', closeAddCenterModal);

    // 모달 닫기 (배경 클릭)
    addCenterModal.addEventListener('click', (e) => {
        if (e.target === addCenterModal) {
            closeAddCenterModal();
        }
    });

    // ESC 키로 모달 닫기
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && addCenterModal.classList.contains('active')) {
            closeAddCenterModal();
        }
    });

    // 주소 자동완성 초기화
    initAddressAutocomplete();

    // 폼 제출
    addCenterForm.addEventListener('submit', handleAddCenterSubmit);

    console.log('✅ 연수원 추가 모달 초기화 완료');
}

// 모달 열기
function openAddCenterModal() {
    addCenterModal.classList.add('active');
    addCenterModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // 스크롤 방지
    console.log('📝 연수원 추가 모달 열림');
}

// 모달 닫기
function closeAddCenterModal() {
    addCenterModal.classList.remove('active');
    addCenterModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // 스크롤 복원
    addCenterForm.reset(); // 폼 리셋
    console.log('✖️ 연수원 추가 모달 닫힘');
}

// 주소 → 좌표 변환 (네이버 Geocoding)
async function geocodeAddress(address) {
    return new Promise((resolve, reject) => {
        if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
            reject(new Error('네이버 지도 API가 로드되지 않았습니다'));
            return;
        }

        naver.maps.Service.geocode({
            query: address
        }, function(status, response) {
            if (status !== naver.maps.Service.Status.OK) {
                reject(new Error('주소를 찾을 수 없습니다'));
                return;
            }

            if (response.v2.addresses.length === 0) {
                reject(new Error('주소 결과가 없습니다'));
                return;
            }

            const result = response.v2.addresses[0];
            const lat = parseFloat(result.y);
            const lng = parseFloat(result.x);

            resolve({ lat, lng });
        });
    });
}

// 지역 추출 함수
function extractRegion(address) {
    // 주소에서 지역 추출 (서울, 경기, 부산 등)
    const regionMap = {
        '서울': '서울',
        '경기': '경기',
        '인천': '인천',
        '부산': '부산',
        '대구': '대구',
        '대전': '대전',
        '광주': '광주',
        '울산': '울산',
        '세종': '세종',
        '강원': '강원',
        '충북': '충북',
        '충남': '충남',
        '전북': '전북',
        '전남': '전남',
        '경북': '경북',
        '경남': '경남',
        '제주': '제주'
    };

    for (const [key, value] of Object.entries(regionMap)) {
        if (address.includes(key)) {
            return value;
        }
    }

    return '기타';
}

// 폼 제출 처리
async function handleAddCenterSubmit(e) {
    e.preventDefault();

    const submitBtn = addCenterForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    try {
        // 버튼 비활성화 및 로딩 표시
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 추가 중...';

        // 폼 데이터 수집
        const formData = new FormData(addCenterForm);
        const name = formData.get('name');
        const address = formData.get('address');
        const phone = formData.get('phone');
        const capacity = formData.get('capacity');
        const naverUrl = formData.get('naverUrl');
        const website = formData.get('website');
        const basicInfo = formData.get('basicInfo');

        console.log('📝 연수원 추가 시작:', name);

        // 주소 → 좌표 변환
        toast.show('주소를 좌표로 변환하는 중...', 'info', '위치 검색');
        const location = await geocodeAddress(address);
        console.log('📍 좌표 변환 완료:', location);

        // 지역 추출
        const region = extractRegion(address);

        // Firebase에 저장할 데이터
        const centerData = {
            name: name,
            address: address,
            location: location,
            region: region,
            phone: phone || null,
            capacity: capacity ? parseInt(capacity) : null,
            basicInfo: basicInfo || null,
            links: {
                naver: naverUrl || null,
                website: website || null
            },
            createdAt: new Date().toISOString(),
            createdBy: 'user' // 추후 인증 시스템 추가 시 변경 가능
        };

        // Firebase에 저장
        toast.show('Firebase에 저장하는 중...', 'info', '데이터 저장');
        const docRef = await saveToFirebase(centerData);
        console.log('💾 Firebase 저장 완료:', docRef.id);

        // 지도에 마커 추가
        centerData.id = docRef.id;
        addMarkerToMap(centerData);

        // 성공 메시지
        toast.show(`"${name}" 연수원이 성공적으로 추가되었습니다!`, 'success', '추가 완료');

        // 모달 닫기
        setTimeout(() => {
            closeAddCenterModal();
        }, 1000);

    } catch (error) {
        console.error('❌ 연수원 추가 실패:', error);
        toast.show(
            error.message || '연수원 추가 중 오류가 발생했습니다',
            'error',
            '추가 실패'
        );
    } finally {
        // 버튼 복원
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Firebase에 저장 (공통 설정 사용)
async function saveToFirebase(centerData) {
    // 이미 초기화된 Firebase 인스턴스 사용
    if (window.firebase && window.firebase.db && window.firebase.addDoc) {
        const { db, collection, addDoc } = window.firebase;
        const docRef = await addDoc(collection(db, COLLECTIONS.TRAINING_CENTERS), centerData);
        return docRef;
    }

    // Firebase가 초기화되지 않은 경우 초기화
    const { initializeApp } = await import(getFirebaseUrl('app'));
    const { getFirestore, collection, addDoc } = await import(getFirebaseUrl('firestore'));

    // 공통 설정 사용 (firebase-config.js)
    const app = initializeApp(FIREBASE_CONFIG);
    const firebaseDb = getFirestore(app);
    const docRef = await addDoc(collection(firebaseDb, COLLECTIONS.TRAINING_CENTERS), centerData);

    return docRef;
}

// 지도에 마커 추가
function addMarkerToMap(centerData) {
    const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(centerData.location.lat, centerData.location.lng),
        map: map,
        title: centerData.name,
        icon: {
            content: `<div class="custom-marker"><i class="fas fa-map-marker-alt"></i></div>`,
            anchor: new naver.maps.Point(15, 40)
        }
    });

    // 마커 클릭 이벤트
    naver.maps.Event.addListener(marker, 'click', function() {
        const content = generateInfoWindowContent(centerData);
        infoWindowManager.openInfoWindow(map, marker, content);
    });

    // 전역 마커 배열에 추가
    allMarkers.push(marker);
    filteredMarkers.push(marker);

    // 클러스터 재적용
    if (clusterer) {
        clusterer.clearMarkers();
        clusterer.setMarkers(allMarkers);
    }

    // 해당 위치로 지도 이동
    map.setCenter(new naver.maps.LatLng(centerData.location.lat, centerData.location.lng));
    map.setZoom(15);

    console.log('📍 지도에 마커 추가 완료:', centerData.name);
}

// DOMContentLoaded 이벤트에 모달 초기화 추가
document.addEventListener('DOMContentLoaded', () => {
    // 기존 초기화 후 모달 초기화
    setTimeout(() => {
        initAddCenterModal();
    }, 100);
});

console.log('✅ 연수원 추가 기능 로드 완료');

// 주소 자동완성 초기화
let addressSearchTimeout = null;
let selectedAddressSuggestion = -1;

function initAddressAutocomplete() {
    const addressInput = document.getElementById('center-address');
    const suggestionsDiv = document.getElementById('address-suggestions');

    if (!addressInput || !suggestionsDiv) {
        console.warn('⚠️ 주소 입력 필드를 찾을 수 없습니다');
        return;
    }

    // 입력 이벤트 (디바운스)
    addressInput.addEventListener('input', function(e) {
        const query = e.target.value.trim();

        // 타임아웃 클리어
        clearTimeout(addressSearchTimeout);

        if (query.length < 2) {
            hideSuggestions();
            return;
        }

        // 300ms 디바운스
        addressSearchTimeout = setTimeout(() => {
            searchAddress(query, suggestionsDiv);
        }, 300);
    });

    // 키보드 네비게이션
    addressInput.addEventListener('keydown', function(e) {
        const items = suggestionsDiv.querySelectorAll('.address-suggestion-item');

        if (items.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedAddressSuggestion = Math.min(selectedAddressSuggestion + 1, items.length - 1);
            updateSuggestionSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedAddressSuggestion = Math.max(selectedAddressSuggestion - 1, 0);
            updateSuggestionSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedAddressSuggestion >= 0 && items[selectedAddressSuggestion]) {
                items[selectedAddressSuggestion].click();
            }
        } else if (e.key === 'Escape') {
            hideSuggestions();
        }
    });

    // 외부 클릭 시 닫기
    document.addEventListener('click', function(e) {
        if (!addressInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            hideSuggestions();
        }
    });

    function hideSuggestions() {
        suggestionsDiv.classList.remove('active');
        suggestionsDiv.innerHTML = '';
        selectedAddressSuggestion = -1;
    }

    function updateSuggestionSelection(items) {
        items.forEach((item, index) => {
            if (index === selectedAddressSuggestion) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    console.log('✅ 주소 자동완성 초기화 완료');
}

// 주소 검색 (네이버 Geocoding API)
async function searchAddress(query, suggestionsDiv) {
    if (!window.naver || !window.naver.maps || !window.naver.maps.Service) {
        console.warn('⚠️ 네이버 지도 API가 로드되지 않았습니다');
        return;
    }

    // 로딩 표시
    suggestionsDiv.innerHTML = '<div class="address-suggestion-loading"><i class="fas fa-spinner fa-spin"></i> 검색 중...</div>';
    suggestionsDiv.classList.add('active');

    naver.maps.Service.geocode({
        query: query
    }, function(status, response) {
        if (status !== naver.maps.Service.Status.OK) {
            suggestionsDiv.innerHTML = '<div class="address-suggestion-empty">주소를 찾을 수 없습니다</div>';
            return;
        }

        if (!response.v2 || !response.v2.addresses || response.v2.addresses.length === 0) {
            suggestionsDiv.innerHTML = '<div class="address-suggestion-empty">검색 결과가 없습니다</div>';
            return;
        }

        // 결과 표시
        const addresses = response.v2.addresses;
        let html = '';

        addresses.forEach((addr, index) => {
            const roadAddress = addr.roadAddress || addr.jibunAddress;
            const jibunAddress = addr.jibunAddress;

            html += `
                <div class="address-suggestion-item" data-index="${index}" data-address="${roadAddress}" data-lat="${addr.y}" data-lng="${addr.x}">
                    <div class="address-suggestion-main">${roadAddress}</div>
                    ${jibunAddress && jibunAddress !== roadAddress ? `<div class="address-suggestion-sub">(지번) ${jibunAddress}</div>` : ''}
                </div>
            `;
        });

        suggestionsDiv.innerHTML = html;

        // 클릭 이벤트 추가
        const items = suggestionsDiv.querySelectorAll('.address-suggestion-item');
        items.forEach(item => {
            item.addEventListener('click', function() {
                const address = this.getAttribute('data-address');
                const addressInput = document.getElementById('center-address');

                if (addressInput) {
                    addressInput.value = address;
                }

                suggestionsDiv.classList.remove('active');
                suggestionsDiv.innerHTML = '';
                selectedAddressSuggestion = -1;

                console.log('📍 주소 선택:', address);
                toast.show('주소가 선택되었습니다', 'success', '선택 완료');
            });
        });
    });
}

console.log('✅ 네이버 주소 검색 기능 로드 완료');

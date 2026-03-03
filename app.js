// ====== ?�전??개선??app.js ?�일 (모든 문제 ?�결) ======

// ===== Firebase 공통 ?�정 import =====
import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION, getFirebaseUrl, COLLECTIONS } from './firebase-config.js';

// ===== ?�역 변???�언 =====
let map = null;
let db = null;
let allMarkers = [];
let filteredMarkers = [];
let clusterer = null;
let infoWindowManager = null;
let firebaseLoaded = false;
let mapInitialized = false;

// ===== ?�스???�림 관리자 =====
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            this.container.setAttribute('role', 'region');
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-label', '?�림');
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
            success: title || '?�공',
            error: title || '?�류',
            warning: title || '주의',
            info: title || '?�림'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon" aria-hidden="true"></i>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="?�림 ?�기">
                <i class="fas fa-times"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.remove(toast));

        this.container.appendChild(toast);

        // ?�동 ?�거
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        console.log(`?�� ?�스???�림 [${type}]: ${message}`);
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

// ?�역 ?�스??매니?� ?�스?�스
const toast = new ToastManager();

// ===== Firebase 초기??(?�전???�러 처리) =====
async function initializeFirebase() {
    try {
        console.log('?�� Firebase 초기???�도... (공통 ?�정 ?�용)');

        // 공통 ?�정?�서 가?�온 URL ?�용
        const { initializeApp } = await import(getFirebaseUrl('app'));
        const { getFirestore, collection, getDocs, addDoc } = await import(getFirebaseUrl('firestore'));

        // 공통 ?�정 ?�용 (firebase-config.js)
        const app = initializeApp(FIREBASE_CONFIG);
        db = getFirestore(app);
        firebaseLoaded = true;

        // ?�역?�로 ?�출
        window.firebase = { db, collection, getDocs, addDoc };

        console.log('??Firebase 초기???�공 (SDK v' + FIREBASE_SDK_VERSION + ')');
        return { db, collection, getDocs, addDoc };

    } catch (error) {
        console.warn('?�️ Firebase 초기???�패, ?�플 ?�이?�로 진행:', error);
        firebaseLoaded = false;
        toast.warning('?�시�??�이???�결???�패?�습?�다. ?�플 ?�이?��? ?�시?�니??', 'Firebase ?�결 ?�패', 8000);
        return null;
    }
}

// ===== ?�보�?관리자 ?�래??=====
class InfoWindowManager {
    constructor() {
        this.currentInfoWindow = null;
        this.currentMarker = null;
        this.setupEventDelegation();
        console.log('???�보�?관리자 초기???�료');
    }

    setupEventDelegation() {
        // ?�벤???�임?�로 ?�기 버튼 처리
        document.addEventListener('click', (event) => {
            const closeBtn = event.target.closest('.info-window-close');
            if (closeBtn) {
                event.preventDefault();
                event.stopPropagation();
                this.closeCurrentInfoWindow();
                console.log('?�� ?�보�??�힘');
            }
        });

        // ESC ?�로 ?�보�??�기
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

            // InfoWindow가 ?�린 ???�기 버튼???�벤??바인??
            setTimeout(() => {
                const closeBtn = document.querySelector('.info-window-close');
                if (closeBtn) {
                    closeBtn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.closeCurrentInfoWindow();
                        console.log('?�� ?�보�??�힘 (X 버튼)');
                    };
                }
            }, 100);

            console.log('?�� ?�보�??�림:', marker.getTitle());
            return infoWindow;

        } catch (error) {
            console.error('???�보�??�기 ?�패:', error);
            return null;
        }
    }

    closeCurrentInfoWindow() {
        if (this.currentInfoWindow) {
            try {
                this.currentInfoWindow.close();
            } catch (error) {
                console.warn('?�️ ?�보�??�기 �??�류:', error);
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

// ===== 마커 ?�이�?HTML ?�성 ?�수 =====
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

// ===== ?�보�??�용 HTML ?�성 ?�수 =====
const createInfoWindowContent = (center) => {
    // 주소 ?�보
    const addressHtml = center.address ?
        `<div class="info-window-info">
            <i class="fas fa-map-marker-alt" style="color: #0077cc; margin-right: 6px;"></i> 
            ${center.address}
        </div>` : '';

    // 기본 ?�보
    const basicInfoHtml = center.basicInfo ?
        `<div class="info-window-info" style="margin-top: 8px;">
            ${center.basicInfo.length > 100 ? center.basicInfo.substring(0, 100) + '...' : center.basicInfo}
        </div>` : '';

    // 버튼??
    let buttonsHtml = '';

    if (center.links?.naver) {
        buttonsHtml += `
            <a href="${center.links.naver}" target="_blank" rel="noopener noreferrer" class="directions-button">
                <i class="fas fa-directions"></i> 길찾�?
            </a>
        `;
    }

    if (center.links?.website) {
        buttonsHtml += `
            <a href="${center.links.website}" target="_blank" rel="noopener noreferrer" class="search-button">
                <i class="fas fa-external-link-alt"></i> ?�사?�트
            </a>
        `;
    }

    // 공유 버튼 추�?
    buttonsHtml += `
        <button class="share-button search-button" data-center-id="${center.id}" onclick="shareCenter('${center.id}')">
            <i class="fas fa-share-alt"></i> 공유
        </button>
    `;

    // 추�? ?�보 ?�그
    let tagsHtml = '';
    if (center.capacity) {
        tagsHtml += `<span class="info-tag"><i class="fas fa-users"></i> ${center.capacity}�?/span>`;
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
                <button class="info-window-close" aria-label="?�보�??�기">
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

// ===== ?�플 ?�이???�성 =====
const generateSampleData = () => {
    console.log('?�� ?�플 ?�이???�성');

    return [
        {
            id: 'sample1',
            name: '?�울교육?�수??,
            branch: '강남지??,
            basicInfo: '최신 ?�설??갖춘 교육?�문 ?�수?�입?�다. ?�양??교육 ?�로그램�??�의?�설???�공?�며, 지?�철 2?�선 강남??��???�보 5�?거리???�치???�습?�다.',
            region: '?�울',
            capacity: 150,
            address: '?�울?�별??강남�??�헤?��?123',
            location: { lat: 37.4979, lng: 127.0276 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample2',
            name: '경기?�수??,
            branch: '?�원지??,
            basicInfo: '?�연 친화???�경???�규모 ?�수?�설?�니?? ?�박?�설�?체육?�설???�비?�어 ?�으�? ?�체 ?�수??최적?�된 ?�설??보유?�고 ?�습?�다.',
            region: '경기',
            capacity: 300,
            address: '경기???�원???�통�??�드컵로 456',
            location: { lat: 37.2636, lng: 127.0286 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample3',
            name: '부?�연?�원',
            branch: '?�운?�지??,
            basicInfo: '바다가 보이???�름?�운 ?�수?�입?�다. ?�양?�포츠�? ?�계???�별 ?�로그램???�영?�며, ?�양�?교육???�께 ?????�는 최고???�경???�공?�니??',
            region: '부??,
            capacity: 200,
            address: '부?�광??�� ?�운?��??�운?�?��?�?789',
            location: { lat: 35.1595, lng: 129.1615 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample4',
            name: '?�?�교?�센??,
            branch: '?�성지??,
            basicInfo: '과학?�시 ?�?�의 첨단 교육?�설?�니?? IT 교육???�화???�비?� ?�설??보유?�고 ?�으�? ?�구개발 관??교육 ?�로그램???�공?�니??',
            region: '?�??,
            capacity: 120,
            address: '?�?�광??�� ?�성�??�?�로 321',
            location: { lat: 36.3504, lng: 127.3845 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample5',
            name: '?�주?�수??,
            branch: '?�주?��???,
            basicInfo: '?�름?�운 ?�주?�의 ?�연 ?�에??진행?�는 ?�별???�수 경험???�공?�니?? ?�주??�?�� ?�연?�경�??�께?�는 ?�링 ?�수 ?�로그램???�징?�니??',
            region: '?�주',
            capacity: 80,
            address: '?�주?�별?�치???�주??첨단�?654',
            location: { lat: 33.4996, lng: 126.5312 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample6',
            name: '강원?�수??,
            branch: '춘천지??,
            basicInfo: '�?�� 강원?�의 ?�연 ?�에???�영?�는 ?�수?�입?�다. ?�과 ?�수가 ?�우?�진 ?�경?�서 ?�신???�충?�할 ???�습?�다.',
            region: '강원',
            capacity: 180,
            address: '강원??춘천???�암?��?789',
            location: { lat: 37.8813, lng: 127.7298 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample7',
            name: '?�남?�수??,
            branch: '?�천지??,
            basicInfo: '?�도???�취�??�낄 ???�는 ?�통�??��?가 조화???�수?�입?�다. ?�천�?�???�원�??�접???�습?�다.',
            region: '?�라',
            capacity: 160,
            address: '?�라?�도 ?�천???�천만길 123',
            location: { lat: 34.9506, lng: 127.4872 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        },
        {
            id: 'sample8',
            name: '경북?�수??,
            branch: '경주지??,
            basicInfo: '천년 고도 경주????��??배경 ?�에???�영?�는 ?�수?�입?�다. 문화?�적지 견학�??�계???�별 ?�로그램???�공?�니??',
            region: '경상',
            capacity: 140,
            address: '경상북도 경주??첨성�?456',
            location: { lat: 35.8562, lng: 129.2247 },
            links: {
                website: 'https://example.com',
                naver: 'https://map.naver.com'
            }
        }
    ];
};

// ===== 지??초기???�수 =====
const initMap = async () => {
    try {
        console.log('?���?지??초기???�작');
        showLoadingMessage('지?��? 초기?�하??�?..');

        // ?�이�?지??API 로드 ?�인
        if (typeof naver === 'undefined' || !naver.maps) {
            throw new Error('?�이�?지??API가 로드?��? ?�았?�니??);
        }

        // 지???�성 (부?�러???�니메이???�정)
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
            // 부?�러???�니메이???�정
            tileTransition: true,
            tileDuration: 200,
            zoomOrigin: null,
            pinchZoom: true,
            scrollWheel: true,
            keyboardShortcuts: true,
            draggable: true,
            disableKineticPan: false,
            tileSpare: 2,
            // ?�능 최적??
            useStyleMap: true,
            blankTileImage: null,
            // 부?�러???��?/축소�??�한 ?�정
            zoomControlOptions: {
                position: naver.maps.Position.TOP_RIGHT,
                style: naver.maps.ZoomControlStyle.SMALL
            }
        });

        console.log('??지???�성 ?�료');

        // ?�보�?관리자 초기??
        infoWindowManager = new InfoWindowManager();

        // ?�벤??리스???�정
        setupMapControlEvents();
        setupFilterEvents();
        setupSearchEvents();
        setupLogoClickEvent();

        // ?�수???�이??로드
        showLoadingMessage('?�수???�이?��? 불러?�는 �?..');
        await loadCenters();

        // URL ?�라미터 처리
        handleUrlParams();

        // 초기???�료
        mapInitialized = true;
        hideMapLoading();

        console.log('?�� 지??초기???�료');

    } catch (error) {
        console.error('??지??초기???�패:', error);
        showError(`지??초기?�에 ?�패?�습?�다: ${error.message}`);
        hideMapLoading();
    }
};

// ===== ?�수???�이??로드 =====
const loadCenters = async () => {
    try {
        console.log('?�� ?�수???�이??로드 ?�작');

        let centersData = [];

        // Firebase 초기???�도
        const firebaseModules = await initializeFirebase();

        if (firebaseModules && firebaseLoaded) {
            try {
                showLoadingMessage('Firebase?�서 ?�이?��? 가?�오??�?..');

                const { collection, getDocs } = firebaseModules;
                const querySnapshot = await getDocs(collection(db, "trainingCenters"));

                querySnapshot.forEach((doc) => {
                    const center = doc.data();
                    center.id = doc.id;
                    centersData.push(center);
                });

                console.log(`??Firebase?�서 ${centersData.length}�??�수??로드 ?�료`);
                toast.success(`${centersData.length}개의 ?�수???�보�?불러?�습?�다.`, '?�이??로드 ?�료', 4000);

            } catch (firebaseError) {
                console.warn('?�️ Firebase ?�이??로드 ?�패, ?�플 ?�이???�용:', firebaseError);
                centersData = generateSampleData();
                toast.warning('?�이??로드 ?�패. ?�플 ?�이?��? ?�시?�니??', 'Firebase ?�류', 6000);
            }
        } else {
            console.log('?�� Firebase ?�결 ?�패, ?�플 ?�이???�용');
            centersData = generateSampleData();
        }

        // ?�이??검�?
        if (!Array.isArray(centersData) || centersData.length === 0) {
            throw new Error('?�수???�이?��? ?�습?�다');
        }

        // 마커 ?�성
        showLoadingMessage('지?�에 ?�수?�을 ?�시?�는 �?..');
        await createMarkersFromData(centersData);

        // 결과 카운???�데?�트
        updateResultsCount(centersData.length);

        console.log(`?�� �?${centersData.length}�??�수??마커 ?�성 ?�료`);

    } catch (error) {
        console.error('???�이??로드 ?�패:', error);

        // 최후??방법: ?�플 ?�이?�로 복구
        try {
            const sampleData = generateSampleData();
            await createMarkersFromData(sampleData);
            updateResultsCount(sampleData.length);
            console.log('?�� ?�플 ?�이?�로 복구 ?�료');
        } catch (sampleError) {
            console.error('???�플 ?�이??복구???�패:', sampleError);
            showError('?�수???�이?��? 불러?????�습?�다. ?�이지�??�로고침?�주?�요.');
        }
    }
};

// ===== 마커 ?�성 =====
const createMarkersFromData = async (centersData) => {
    try {
        allMarkers = [];

        // 마커 ?�성
        centersData.forEach((center, index) => {
            if (center.location && center.location.lat && center.location.lng) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    map: null, // ?�러?�터?��? 관�?
                    title: center.name,
                    icon: {
                        content: createMarkerContent(center.name),
                        anchor: new naver.maps.Point(15, 40)
                    }
                });

                // 마커???�이???�??
                marker.centerData = center;

                // 마커 ?�릭 ?�벤??
                naver.maps.Event.addListener(marker, 'click', function () {
                    const content = createInfoWindowContent(center);
                    infoWindowManager.openInfoWindow(map, marker, content);
                });

                allMarkers.push(marker);
            } else {
                console.warn('?�️ ?�효?��? ?��? ?�치 ?�이??', center);
            }
        });

        console.log(`?�� ${allMarkers.length}�?마커 ?�성 ?�료`);

        // 마커 ?�러?�터�??�용
        await applyMarkerClustering();

        filteredMarkers = [...allMarkers];

    } catch (error) {
        console.error('??마커 ?�성 ?�패:', error);
        throw error;
    }
};

// ===== 마커 ?�러?�터�??�용 =====
const applyMarkerClustering = async () => {
    try {
        if (typeof MarkerClustering !== 'undefined' && allMarkers.length > 0) {
            console.log('?�� 마커 ?�러?�터�??�용 �?..');

            clusterer = new MarkerClustering({
                minClusterSize: 2,
                maxZoom: 13,
                map: map,
                markers: allMarkers,
                disableClickZoom: true, // 기본 �??�작 비활?�화 (커스?� ?�들???�용)
                gridSize: 120,
                icons: [
                    {
                        content: '<div style="display:none;"></div>',
                        size: new naver.maps.Size(40, 40),
                        anchor: new naver.maps.Point(20, 20)
                    }
                ],
                indexGenerator: [10, 100, 200, 500, 1000],
                stylingFunction: function (clusterMarker, count) {
                    // 0�??�는 1개일 ?�는 ?�러?�터 마커 ?�전???��?
                    if (count <= 1) {
                        // Naver Maps API�?마커 ?��?
                        if (typeof clusterMarker.setVisible === 'function') {
                            clusterMarker.setVisible(false);
                        }
                        // DOM ?�소???��? 처리
                        const element = clusterMarker.getElement();
                        if (element) {
                            element.style.display = 'none';
                            element.style.visibility = 'hidden';
                            element.style.opacity = '0';
                            element.style.pointerEvents = 'none';
                        }
                        return;
                    }

                    // ?�러?�터 ?�기�??�래??�??�이�?결정
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

                    // ?�러?�터 마커 보이�?
                    if (typeof clusterMarker.setVisible === 'function') {
                        clusterMarker.setVisible(true);
                    }

                    // DOM 직접 ?�데?�트�??�제 count ?�시
                    const element = clusterMarker.getElement();
                    if (element) {
                        element.style.display = 'block';
                        element.style.visibility = 'visible';
                        element.style.opacity = '1';
                        element.style.pointerEvents = 'auto';
                        element.innerHTML = `<div class="cluster-marker ${className}">${count}</div>`;
                        element.style.width = size + 'px';
                        element.style.height = size + 'px';
                        element.style.cursor = 'pointer';

                        // DOM ?�소??직접 ?�릭 ?�벤??추�? (??번만)
                        if (!element._clusterClickBound) {
                            element._clusterClickBound = true;
                            element.addEventListener('click', function (e) {
                                e.stopPropagation();
                                const position = clusterMarker.getPosition();
                                if (position) {
                                    const currentZoom = map.getZoom();
                                    const newZoom = Math.min(currentZoom + 2, 18);

                                    map.morph(position, newZoom, {
                                        duration: 500,
                                        easing: 'easeOutCubic'
                                    });

                                    console.log(`?�� ?�러?�터 ?�릭: ${count}�?마커, �?${currentZoom} ??${newZoom}`);
                                }
                            });
                        }
                    }
                }
            });

            console.log('??마커 ?�러?�터�??�용 ?�료');

        } else {
            console.warn('?�️ MarkerClustering ?�이브러�??�음, 개별 마커 ?�시');

            // ?�러?�터�??�이 개별 마커 ?�시
            allMarkers.forEach(marker => {
                marker.setMap(map);
            });
        }

    } catch (error) {
        console.error('???�러?�터�??�용 ?�패:', error);

        // ?�백: 개별 마커 ?�시
        allMarkers.forEach(marker => {
            try {
                marker.setMap(map);
            } catch (markerError) {
                console.warn('?�️ 마커 ?�시 ?�패:', markerError);
            }
        });
    }
};

// ===== 지??컨트�??�벤???�정 =====
const setupMapControlEvents = () => {
    // ?�재 ?�치 버튼
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

                        // 부?�러???�니메이?�으�??�동
                        map.morph(currentPos, 15, {
                            duration: 1000,
                            easing: 'easeInOutCubic'
                        });

                        // ?�니메이???�료 ??마커 ?�시
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

                        console.log('?�� ?�재 ?�치�??�동');

                        currentLocationBtn.disabled = false;
                        currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    },
                    (error) => {
                        console.warn('?�️ ?�치 ?�보 가?�오�??�패:', error);
                        alert('?�치 ?�보�?가?�올 ???�습?�다. ?�치 권한???�인?�주?�요.');

                        currentLocationBtn.disabled = false;
                        currentLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i>';
                    },
                    {
                        timeout: 10000,
                        enableHighAccuracy: true
                    }
                );
            } else {
                alert('??브라?��????�치 ?�비?��? 지?�하지 ?�습?�다.');
            }
        });
    }

    // ?��? 버튼
    const zoomInBtn = document.getElementById('zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            const currentZoom = map.getZoom();
            const newZoom = Math.min(currentZoom + 1, 21); // 최�? �??�벨 ?�한

            // 부?�러???�니메이?�으�??��?
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
            const newZoom = Math.max(currentZoom - 1, 1); // 최소 �??�벨 ?�한

            // 부?�러???�니메이?�으�?축소
            map.morph(map.getCenter(), newZoom, {
                duration: 300,
                easing: 'easeOutCubic'
            });
        });
    }

    // ?�체보기 버튼
    const resetMapBtn = document.getElementById('reset-map');
    if (resetMapBtn) {
        resetMapBtn.addEventListener('click', () => {
            // 부?�러???�니메이?�으�?초기 ?�치 복�?
            map.morph(new naver.maps.LatLng(36.2253017, 127.6460516), 7, {
                duration: 800,
                easing: 'easeInOutCubic'
            });

            infoWindowManager.closeCurrentInfoWindow();
            resetAllFilters();
            console.log('?�� 지??초기 ?�치�?복�?');
        });
    }
};

// ===== ?�터 ?�벤???�정 =====
const setupFilterEvents = () => {
    const regionFilter = document.getElementById('region-filter');
    const capacityFilter = document.getElementById('capacity-filter');

    if (regionFilter) {
        regionFilter.addEventListener('change', applyFilters);
    }

    if (capacityFilter) {
        capacityFilter.addEventListener('change', applyFilters);
    }

    // ?�터 ?��? 버튼
    const filterToggle = document.querySelector('.filter-toggle');
    const filterOptions = document.querySelector('.filter-options');

    if (filterToggle && filterOptions) {
        filterToggle.addEventListener('click', function () {
            const isExpanded = this.getAttribute('aria-expanded') === 'true';

            this.setAttribute('aria-expanded', !isExpanded);
            filterOptions.classList.toggle('show');
            this.classList.toggle('active');
        });

        // ?�터 ?��? ?�릭 ???�기
        document.addEventListener('click', function (e) {
            if (!filterToggle.contains(e.target) && !filterOptions.contains(e.target)) {
                filterOptions.classList.remove('show');
                filterToggle.classList.remove('active');
                filterToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }
};

// ===== 검???�벤???�정 =====
// ===== 최근 검?�어 관�?(localStorage) =====
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

    // 최근 검?�어 ?�널 ?�시
    const showRecentSearches = () => {
        if (!searchResults) return;
        const list = getRecentSearches();
        if (list.length === 0) { hideSearchResults(); return; }
        const html = `
            <div style="padding:8px 12px;font-size:12px;color:#999;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;">
                <span>최근 검?�어</span>
                <button id="clear-recent-btn" style="background:none;border:none;color:#0077cc;font-size:12px;cursor:pointer;min-height:auto;min-width:auto;padding:0;">?�체 ??��</button>
            </div>
            ${list.map(s => `
                <div class="search-result-item recent-search-item" data-query="${s}" style="display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-history" style="color:#bbb;font-size:13px;"></i>
                    <span class="search-result-name">${s}</span>
                </div>
            `).join('')}
        `;
        searchResults.innerHTML = html;
        searchResults.style.display = 'block';

        // ?�체 ??�� 버튼
        document.getElementById('clear-recent-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            clearRecentSearches();
            hideSearchResults();
        });

        // 최근 검?�어 ?�릭
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

        // 검?�창 ?�커????최근 검?�어 ?�시
        searchInput.addEventListener('focus', function () {
            if (this.value.trim().length === 0) {
                showRecentSearches();
            }
        });

        // 검???�력 ?�벤??
        searchInput.addEventListener('input', function () {
            const query = this.value.trim();

            // ?�리??버튼 ?�시/?��?
            if (clearIcon) {
                clearIcon.style.display = query.length > 0 ? 'block' : 'none';
            }

            // ?�바?�싱
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (query.length > 0) {
                    showSearchResults(query);
                } else {
                    showRecentSearches();
                    applyFilters();
                }
            }, 300);
        });

        // ?�터 ??처리
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const q = this.value.trim();
                if (q) saveRecentSearch(q);
                applyFilters();
                hideSearchResults();
            }
        });
    }

    // ?�리??버튼 ?�벤??
    if (clearIcon) {
        clearIcon.addEventListener('click', function () {
            if (searchInput) {
                searchInput.value = '';
                searchInput.focus();
                this.style.display = 'none';
                showRecentSearches();
                applyFilters();
            }
        });
    }

    // 관?�성 ?�수 계산 ?�수
    function calculateRelevance(center, query) {
        const lowerQuery = query.toLowerCase();
        let score = 0;

        // ?�름???�확???�치 (가???��? ?�수)
        if (center.name && center.name.toLowerCase() === lowerQuery) {
            score += 100;
        }
        // ?�름???�작 (?��? ?�수)
        else if (center.name && center.name.toLowerCase().startsWith(lowerQuery)) {
            score += 50;
        }
        // ?�름???�함 (중간 ?�수)
        else if (center.name && center.name.toLowerCase().includes(lowerQuery)) {
            score += 30;
        }

        // 지?�명???�치
        if (center.branch && center.branch.toLowerCase().includes(lowerQuery)) {
            score += 20;
        }

        // 지??�� ?�치
        if (center.region && center.region.toLowerCase().includes(lowerQuery)) {
            score += 15;
        }

        // 기본 ?�보???�치
        if (center.basicInfo && center.basicInfo.toLowerCase().includes(lowerQuery)) {
            score += 5;
        }

        return score;
    }

    // ?�스???�이?�이???�수
    function highlightText(text, query) {
        if (!text || !query) return text;

        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark style="background-color: #fff3cd; padding: 2px 4px; border-radius: 2px; font-weight: 500;">$1</mark>');
    }

    // 검??결과 ?�시 ?�수
    function showSearchResults(query) {
        if (!searchResults || !allMarkers.length) return;

        // 관?�성 ?�수 계산 �??�터�?
        const matches = allMarkers
            .map(marker => ({
                marker,
                score: calculateRelevance(marker.centerData, query)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score) // ?�수 ?�림차순 ?�렬
            .slice(0, 5) // 최�? 5개만 ?�시
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
                        <div class="search-result-info">${highlightedBranch}${highlightedBranch && highlightedRegion ? ' ??' : ''}${highlightedRegion}</div>
                    </div>
                `;
            }).join('');

            searchResults.innerHTML = resultsHtml;
            searchResults.style.display = 'block';

            // 검??결과 ?�릭 ?�벤??
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', function () {
                    const centerId = this.dataset.centerId;
                    const targetMarker = allMarkers.find(marker => marker.centerData.id === centerId);

                    if (targetMarker) {
                        // 부?�러???�니메이?�으�??�동
                        map.morph(targetMarker.getPosition(), 15, {
                            duration: 800,
                            easing: 'easeInOutCubic'
                        });

                        // ?�니메이???�료 ???�보�??�기
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
            searchResults.innerHTML = '<div class="search-result-item">검??결과가 ?�습?�다</div>';
            searchResults.style.display = 'block';
        }
    }

    // 검??결과 ?��? ?�수
    function hideSearchResults() {
        if (searchResults) {
            searchResults.style.display = 'none';
        }
    }
};

// ===== URL ?�라미터 ?�데?�트 (?�터 ?�태 공유) =====
const updateUrlParams = (searchTerm, regionFilter, capacityFilter) => {
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (regionFilter) params.set('region', regionFilter);
    if (capacityFilter) params.set('capacity', capacityFilter);
    const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
    history.replaceState(null, '', newUrl);
};

// ===== ?�터 ?�용 =====
const applyFilters = () => {
    if (!allMarkers.length) return;

    const searchTerm = document.getElementById('search-input')?.value.toLowerCase().trim() || '';
    const regionFilter = document.getElementById('region-filter')?.value || '';
    const capacityFilter = document.getElementById('capacity-filter')?.value || '';

    filteredMarkers = allMarkers.filter(marker => {
        const center = marker.centerData;

        // 검?�어 ?�터
        if (searchTerm) {
            const searchFields = [
                center.name || '',
                center.branch || '',
                center.basicInfo || '',
                center.region || ''
            ].join(' ').toLowerCase();

            if (!searchFields.includes(searchTerm)) return false;
        }

        // 지???�터
        if (regionFilter && center.region !== regionFilter) return false;

        // ?�용?�원 ?�터
        if (capacityFilter) {
            const capacity = parseInt(center.capacity) || 0;
            switch (capacityFilter) {
                case '0-50': if (capacity > 50) return false; break;
                case '51-100': if (capacity < 51 || capacity > 100) return false; break;
                case '101-200': if (capacity < 101 || capacity > 200) return false; break;
                case '201+': if (capacity < 201) return false; break;
            }
        }

        return true;
    });

    // ?�러?�터???�데?�트
    if (clusterer) {
        clusterer.clearMarkers();
        if (filteredMarkers.length > 0) clusterer.setMarkers(filteredMarkers);
    }

    // URL ?�태 ?�데?�트 (기능 5)
    updateUrlParams(searchTerm, regionFilter, capacityFilter);

    // 결과 카운???�데?�트
    updateResultsCount(filteredMarkers.length);
    console.log(`?�� ?�터 ?�용: ${filteredMarkers.length}�?결과`);
};

// ===== 모든 ?�터 초기??=====
const resetAllFilters = () => {
    // ?�터 초기??
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

    // 모든 마커 ?�시 ?�시
    if (clusterer && allMarkers.length > 0) {
        clusterer.clearMarkers();
        clusterer.setMarkers(allMarkers);
    }

    filteredMarkers = [...allMarkers];
    updateResultsCount(allMarkers.length);

    console.log('?�� 모든 ?�터 초기??);
};

// ===== 로고 ?�릭 ?�벤???�정 =====
const setupLogoClickEvent = () => {
    const logoLink = document.querySelector('.logo a');

    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            if (window.location.pathname.endsWith('index.html') ||
                window.location.pathname.endsWith('/')) {
                e.preventDefault();

                // 지??초기 ?�태�?복�? (부?�러???�니메이??
                map.morph(new naver.maps.LatLng(36.2253017, 127.6460516), 7, {
                    duration: 800,
                    easing: 'easeInOutCubic'
                });

                // ?�보�??�기
                infoWindowManager.closeCurrentInfoWindow();

                // 모든 ?�터 초기??
                resetAllFilters();

                console.log('?�� 로고 ?�릭 - 초기 ?�태�?복�?');
            }
        });
    }
};

// ===== URL ?�라미터 처리 (기능 5: ?�터 ?�태 복원 + center ?�동) =====
const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const centerId = urlParams.get('center');
    const searchParam = urlParams.get('search');
    const regionParam = urlParams.get('region');
    const capacityParam = urlParams.get('capacity');

    // ?�터 ?�태 복원
    let filtersApplied = false;
    if (searchParam) {
        const searchInput = document.getElementById('search-input');
        const clearIcon = document.querySelector('.clear-icon');
        if (searchInput) { searchInput.value = searchParam; }
        if (clearIcon) clearIcon.style.display = 'block';
        filtersApplied = true;
    }
    if (regionParam) {
        const regionFilter = document.getElementById('region-filter');
        if (regionFilter) regionFilter.value = regionParam;
        filtersApplied = true;
    }
    if (capacityParam) {
        const capacityFilter = document.getElementById('capacity-filter');
        if (capacityFilter) capacityFilter.value = capacityParam;
        filtersApplied = true;
    }
    if (filtersApplied) {
        applyFilters();
        console.log('?�� URL ?�라미터�??�터 복원:', { searchParam, regionParam, capacityParam });
    }

    // ?�정 ?�수???�커??
    if (centerId && allMarkers.length > 0) {
        setTimeout(() => {
            const targetMarker = allMarkers.find(marker => marker.centerData.id === centerId);
            if (targetMarker) {
                map.morph(targetMarker.getPosition(), 15, { duration: 1200, easing: 'easeInOutCubic' });
                setTimeout(() => {
                    const content = createInfoWindowContent(targetMarker.centerData);
                    infoWindowManager.openInfoWindow(map, targetMarker, content);
                }, 1200);
                console.log('?�� URL ?�라미터�??�정 ?�수???�시:', targetMarker.getTitle());
            }
        }, 1000);
    }
};

// ===== 로딩 메시지 ?�시 =====
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

// ===== 로딩 ?��? =====
const hideMapLoading = () => {
    const mapLoading = document.getElementById('map-loading');
    if (mapLoading) {
        mapLoading.style.display = 'none';
    }

    // index.html?�서 ?�의???�수 ?�출
    if (typeof window.hideMapLoading === 'function') {
        window.hideMapLoading();
    }

    console.log('??지??로딩 ?�료');
};

// ===== 결과 카운???�데?�트 =====
const updateResultsCount = (count) => {
    // index.html?�서 ?�의???�수 ?�출
    if (typeof window.updateResultsCount === 'function') {
        window.updateResultsCount(count);
    }

    // ?�시 중인 카운???�데?�트
    const visibleCountElements = document.querySelectorAll('#visible-count, #current-count');
    visibleCountElements.forEach(element => {
        if (element) {
            element.textContent = count.toLocaleString();
        }
    });

    console.log(`?�� ?�시 중인 ?�수?? ${count}�?);
};

// ===== ?�러 ?�시 =====
const showError = (message) => {
    console.error('???�러:', message);

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
                <h3 style="margin: 0 0 10px 0; color: #333;">?�류가 발생?�습?�다</h3>
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
                    <i class="fas fa-redo" style="margin-right: 6px;"></i>?�로고침
                </button>
            </div>
        `;
    }
};

// ===== ?�이지 로드 ??초기??=====
document.addEventListener('DOMContentLoaded', () => {
    console.log('?�� DOM 로드 ?�료 - 지??초기??준�?);

    // ?�이�?지??API 로드 ?��?
    const checkNaverMaps = (attempts = 0) => {
        if (typeof naver !== 'undefined' && naver.maps) {
            console.log('???�이�?지??API 로드 ?�료');
            initMap();
        } else if (attempts < 50) { // 5초간 ?��?
            setTimeout(() => checkNaverMaps(attempts + 1), 100);
        } else {
            console.error('???�이�?지??API 로드 ?�?�아??);
            showError('지??API 로드???�패?�습?�다. ?�트?�크 ?�결???�인?�고 ?�로고침?�주?�요.');
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
            toast.error('?�수???�보�?찾을 ???�습?�다.', '공유 ?�패');
            return;
        }

        const center = marker.centerData;
        const shareUrl = `${window.location.origin}${window.location.pathname}?center=${centerId}`;
        const shareData = {
            title: `${center.name} - ?�수???�기?�때`,
            text: `${center.name}${center.branch ? ' (' + center.branch + ')' : ''} - ${center.address || '?�치 ?�보'}`,
            url: shareUrl
        };

        // Web Share API 지???��? ?�인
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            toast.success('공유가 ?�료?�었?�니??', '공유 ?�공', 3000);
            console.log('??공유 ?�공:', shareData);
        } else {
            // ?�백: ?�립보드??복사
            await navigator.clipboard.writeText(shareUrl);
            toast.success('링크가 ?�립보드??복사?�었?�니??', '링크 복사', 4000);
            console.log('?�� ?�립보드 복사:', shareUrl);
        }
    } catch (error) {
        console.error('??공유 ?�패:', error);

        // 공유 ?�패 ???�립보드 복사 ?�도
        try {
            const marker = allMarkers.find(m => m.centerData.id === centerId);
            if (marker) {
                const shareUrl = `${window.location.origin}${window.location.pathname}?center=${centerId}`;
                await navigator.clipboard.writeText(shareUrl);
                toast.info('링크가 ?�립보드??복사?�었?�니??', '링크 복사', 4000);
            }
        } catch (clipboardError) {
            toast.error('공유???�패?�습?�다. ?�시 ?�도?�주?�요.', '공유 ?�패');
        }
    }
}

// ?�역???�출
window.shareCenter = shareCenter;

// ===== ?�버깅을 ?�한 ?�역 ?�수??=====
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

// ===== ?�역 ?�러 처리 =====
window.addEventListener('error', (event) => {
    console.error('???�역 ?�러:', event.error);

    if (!mapInitialized) {
        showError(`?�크립트 ?�류가 발생?�습?�다: ${event.error?.message || '?????�는 ?�류'}`);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('??Promise ?�러:', event.reason);

    if (!mapInitialized) {
        showError(`비동�?처리 �??�류가 발생?�습?�다: ${event.reason?.message || '?????�는 ?�류'}`);
    }
});

// ===== 브라?��? ?�환??체크 =====
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
        console.error('??브라?��? ?�환??문제:', missingFeatures);
        showError(`??브라?��????��? 기능??지?�하지 ?�습?�다. 최신 브라?��?�??�용?�주?�요.\n?�락??기능: ${missingFeatures.join(', ')}`);
    }
})();

console.log('???�전??개선??app.js 로드 ?�료 - 모든 문제 ?�결??);




// ====== 개선된 app.js 파일 (정보창 최적화 버전) ======

// Firebase 초기화
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.firebasestorage.app",
    messagingSenderId: "943690141587",
    appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ===== 개선된 정보창 관리자 클래스 =====
class InfoWindowManager {
    constructor() {
        this.currentInfoWindow = null;
        this.currentMarker = null;
        this.setupEventDelegation();
        console.log('✅ 정보창 관리자 초기화 완료');
    }

    // 이벤트 위임 설정 (한 번만 실행)
    setupEventDelegation() {
        document.addEventListener('click', (event) => {
            const closeBtn = event.target.closest('.info-window-close');
            if (closeBtn) {
                event.preventDefault();
                event.stopPropagation();
                this.closeCurrentInfoWindow();
                console.log('🔽 정보창 닫힘 (이벤트 위임)');
            }
        });
    }

    // 정보창 열기
    openInfoWindow(map, marker, content) {
        // 기존 정보창 닫기
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

    // 정보창 닫기
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

    // 현재 상태 확인용 메서드
    getCurrentInfoWindow() {
        return this.currentInfoWindow;
    }

    getCurrentMarker() {
        return this.currentMarker;
    }
}

// ===== 전역 변수 =====
let map;
let allMarkers = [];
let clusterer = null;

// 정보창 관리자 인스턴스 생성
const infoWindowManager = new InfoWindowManager();

// ===== 마커 아이콘 HTML 생성 함수 =====
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

// ===== 정보창 내용 HTML 생성 함수 =====
const createInfoWindowContent = (center) => {
    // 주소 정보
    const addressHtml = center.address ? 
        `<div class="info-address">
            <i class="fas fa-map-marker-alt"></i> ${center.address}
        </div>` : '';
    
    // 태그 생성 (수용인원, 숙박가능 여부 등)
    let tagHtml = '';
    
    if (center.capacity) {
        tagHtml += `
            <div class="info-tag">
                <i class="fas fa-users"></i> 수용인원: ${center.capacity}명
            </div>
        `;
    }
    
    if (center.accommodation) {
        tagHtml += `
            <div class="info-tag">
                <i class="fas fa-bed"></i> 숙박 가능
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
    
    // 기본 정보 (설명)
    const infoHtml = center.basicInfo ? 
        `<div class="info-description">
            ${center.basicInfo}
        </div>` : '';
    
    // 링크 생성
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
    
    if (center.links?.kakao) {
        linksHtml += `
            <a href="${center.links.kakao}" target="_blank" class="info-link">
                <i class="fas fa-comment"></i> 카카오맵
            </a>
        `;
    }
    
    // 최종 HTML 생성
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

// ===== 데이터 로드 함수 (개선됨) =====
const loadCenters = async () => {
    try {
        console.log('📊 연수원 데이터 로딩 시작...');
        
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const markers = [];
        allMarkers = []; // 전역 배열 초기화

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            center.id = doc.id;

            if (center.location?.lat && center.location?.lng) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    map: map,
                    title: center.name,
                    centerData: center
                });

                // ✅ 개선된 마커 클릭 이벤트 (setTimeout 완전 제거!)
                naver.maps.Event.addListener(marker, 'click', () => {
                    const content = createInfoWindowContent(center);
                    infoWindowManager.openInfoWindow(map, marker, content);
                });
                
                markers.push(marker);
                allMarkers.push(marker);
            }
        });

        // 마커 클러스터링 적용
        if (markers.length > 0) {
            setupMarkerClustering(markers);
            console.log(`✅ ${markers.length}개 마커 로드 완료`);
        }

        // 검색 기능 초기화
        initSearch(allMarkers, map);
        
        // 지도 클릭 시 정보창 닫기
        naver.maps.Event.addListener(map, 'click', () => {
            infoWindowManager.closeCurrentInfoWindow();
        });

    } catch (error) {
        console.error('❌ 데이터 로드 실패:', error);
        alert('연수원 데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
};

// ===== 마커 클러스터링 설정 함수 =====
const setupMarkerClustering = (markers) => {
    // 클러스터 아이콘 정의
    const htmlMarker1 = {
        content: '<div class="cluster-marker cluster-marker-1">',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    };
    const htmlMarker2 = {
        content: '<div class="cluster-marker cluster-marker-2">',
        size: new naver.maps.Size(50, 50),
        anchor: new naver.maps.Point(25, 25)
    };
    const htmlMarker3 = {
        content: '<div class="cluster-marker cluster-marker-3">',
        size: new naver.maps.Size(60, 60),
        anchor: new naver.maps.Point(30, 30)
    };
    const htmlMarker4 = {
        content: '<div class="cluster-marker cluster-marker-4">',
        size: new naver.maps.Size(70, 70),
        anchor: new naver.maps.Point(35, 35)
    };
    const htmlMarker5 = {
        content: '<div class="cluster-marker cluster-marker-5">',
        size: new naver.maps.Size(80, 80),
        anchor: new naver.maps.Point(40, 40)
    };

    // MarkerClustering.js 라이브러리를 이용한 클러스터링 객체 생성
    clusterer = new MarkerClustering({
        minClusterSize: 2,
        maxZoom: 13,
        map: map,
        markers: markers,
        gridSize: 120,
        disableClickZoom: false,
        icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5],
        indexGenerator: [5, 10, 20, 50, 100],
        stylingFunction: function(clusterMarker, count) {
            // 클러스터 내부 마커 개수를 아이콘 div에 표시
            const element = clusterMarker.getElement();
            if (element) {
                element.innerHTML = count;
            }
        }
    });
};

// ===== 지도 초기화 함수 =====
const initMap = () => {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.2253017, 127.6460516),
        zoom: 7,
        zoomControl: false, // 기본 네이버 줌 컨트롤 비활성화 (커스텀 컨트롤 사용)
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: naver.maps.MapTypeControlStyle.DROPDOWN,
            position: naver.maps.Position.TOP_RIGHT
        }
    });

    // 지도 컨트롤 이벤트 리스너 등록
    setupMapControlEvents();

    // Firestore에서 데이터 로드 후 마커 생성
    loadCenters();

    // 필터 토글 기능 설정
    setupFilterToggle();
    
    // 로고 클릭 이벤트 설정
    setupLogoClickEvent();
    
    // URL 파라미터 처리
    handleUrlParams();
    
    console.log('🗺️ 지도 초기화 완료');
};

// ===== 지도 컨트롤 이벤트 설정 =====
const setupMapControlEvents = () => {
    // 현재 위치 버튼
    document.getElementById('current-location')?.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const currentPosition = new naver.maps.LatLng(lat, lng);
                
                map.setCenter(currentPosition);
                map.setZoom(15);
                
                // 현재 위치 마커 표시
                new naver.maps.Marker({
                    position: currentPosition,
                    map: map,
                    icon: {
                        content: '<div class="current-location-marker"></div>',
                        anchor: new naver.maps.Point(10, 10)
                    }
                });
                
                console.log('📍 현재 위치로 이동');
            }, (error) => {
                console.error('위치 정보를 가져올 수 없습니다:', error);
                alert('위치 정보를 가져올 수 없습니다. 브라우저 설정을 확인해주세요.');
            });
        } else {
            alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
        }
    });

    // 확대 버튼
    document.getElementById('zoom-in')?.addEventListener('click', () => {
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom + 1);
    });

    // 축소 버튼
    document.getElementById('zoom-out')?.addEventListener('click', () => {
        const currentZoom = map.getZoom();
        map.setZoom(currentZoom - 1);
    });

    // 전체보기 버튼
    document.getElementById('reset-map')?.addEventListener('click', () => {
        map.setCenter(new naver.maps.LatLng(36.2253017, 127.6460516));
        map.setZoom(7);
        infoWindowManager.closeCurrentInfoWindow();
        console.log('🏠 지도 초기 위치로 복귀');
    });
};

// ===== 검색 기능 초기화 함수 (개선됨) =====
const initSearch = (markers, map) => {
    const searchInput = document.querySelector('.search-input');
    const clearIcon = document.querySelector('.clear-icon');
    const searchResults = document.querySelector('.search-results');

    if (!searchInput || !clearIcon || !searchResults) return;

    // 검색어 입력 시
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim().toLowerCase();

        // 검색어가 있으면 X 버튼 표시
        if (value.length > 0) {
            clearIcon.style.display = 'block';
        } else {
            clearIcon.style.display = 'none';
            searchResults.style.display = 'none';
            return;
        }

        // 입력값과 일치하는 마커만 필터
        const results = markers.filter(marker =>
            marker.getTitle().toLowerCase().includes(value)
        );

        // 자동완성 리스트 갱신
        searchResults.innerHTML = '';
        if (results.length > 0) {
            results.forEach(marker => {
                const li = document.createElement('li');
                li.className = 'search-result-item';
                li.textContent = marker.getTitle();
                
                li.addEventListener('click', () => {
                    // ✅ 개선된 검색 결과 클릭 처리
                    map.setCenter(marker.getPosition());
                    map.setZoom(15);
                    
                    // 정보창 열기
                    const content = createInfoWindowContent(marker.centerData);
                    infoWindowManager.openInfoWindow(map, marker, content);
                    
                    // 검색 결과 숨기기
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                    clearIcon.style.display = 'none';
                    
                    console.log('🔍 검색 결과 선택:', marker.getTitle());
                });
                
                searchResults.appendChild(li);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    });

    // 검색 입력창 외부 클릭 시 결과 숨기기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });

    // 검색 지우기 버튼
    clearIcon.addEventListener('click', () => {
        searchInput.value = '';
        clearIcon.style.display = 'none';
        searchResults.style.display = 'none';
    });
};

// ===== 필터 토글 기능 설정 =====
const setupFilterToggle = () => {
    const filterToggle = document.querySelector('.filter-toggle');
    const filterOptions = document.querySelector('.filter-options');
    
    filterToggle?.addEventListener('click', () => {
        filterOptions.style.display = filterOptions.style.display === 'none' ? 'block' : 'none';
    });
    
    // 필터 옵션 외부 클릭 시 닫기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-container')) {
            filterOptions.style.display = 'none';
        }
    });
    
    // 필터 변경 이벤트 리스너
    document.getElementById('region-filter')?.addEventListener('change', applyFilters);
    document.getElementById('capacity-filter')?.addEventListener('change', applyFilters);
};

// ===== 필터 적용 함수 =====
const applyFilters = () => {
    const regionFilter = document.getElementById('region-filter')?.value || '';
    const capacityFilter = document.getElementById('capacity-filter')?.value || '';
    
    // 모든 마커 숨기기
    allMarkers.forEach(marker => marker.setMap(null));
    
    // 필터에 맞는 마커만 표시
    const filteredMarkers = allMarkers.filter(marker => {
        const centerData = marker.centerData;
        let regionMatch = true;
        let capacityMatch = true;
        
        if (regionFilter && centerData.region) {
            regionMatch = centerData.region.includes(regionFilter);
        }
        
        if (capacityFilter && centerData.capacity) {
            const capacity = parseInt(centerData.capacity);
            switch (capacityFilter) {
                case '0-50':
                    capacityMatch = capacity <= 50;
                    break;
                case '51-100':
                    capacityMatch = capacity > 50 && capacity <= 100;
                    break;
                case '101-200':
                    capacityMatch = capacity > 100 && capacity <= 200;
                    break;
                case '201+':
                    capacityMatch = capacity > 200;
                    break;
            }
        }
        
        return regionMatch && capacityMatch;
    });
    
    // 클러스터 업데이트
    if (clusterer) {
        clusterer.clearMarkers();
        clusterer.setMarkers(filteredMarkers);
    }
    
    // 마커가 없으면 메시지 표시
    if (filteredMarkers.length === 0) {
        alert('필터 조건에 맞는 연수원이 없습니다.');
    }
    
    console.log(`🔎 필터 적용: ${filteredMarkers.length}개 결과`);
};

// ===== 로고 클릭 이벤트 설정 - 지도 초기화 =====
const setupLogoClickEvent = () => {
    const logoLink = document.querySelector('.logo a');
    
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            // 페이지 이동 방지 (이미 index.html에 있을 경우)
            if (window.location.pathname.endsWith('index.html') || 
                window.location.pathname.endsWith('/')) {
                e.preventDefault();
                
                // 지도 초기 상태로 복귀
                map.setCenter(new naver.maps.LatLng(36.2253017, 127.6460516));
                map.setZoom(7);
                
                // 열려있는 정보창 닫기
                infoWindowManager.closeCurrentInfoWindow();
                
                // 필터 초기화
                const regionFilter = document.getElementById('region-filter');
                const capacityFilter = document.getElementById('capacity-filter');
                if (regionFilter) regionFilter.value = '';
                if (capacityFilter) capacityFilter.value = '';
                
                // 검색창 초기화
                const searchInput = document.querySelector('.search-input');
                const clearIcon = document.querySelector('.clear-icon');
                const searchResults = document.querySelector('.search-results');
                if (searchInput) searchInput.value = '';
                if (clearIcon) clearIcon.style.display = 'none';
                if (searchResults) searchResults.style.display = 'none';
                
                // 필터가 적용되었을 경우 모든 마커 다시 표시
                if (clusterer) {
                    clusterer.clearMarkers();
                    clusterer.setMarkers(allMarkers);
                }
                
                console.log('🏠 로고 클릭 - 초기 상태로 복귀');
            }
        });
    }
};

// ===== URL 파라미터 처리 =====
const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const centerId = urlParams.get('center');
    
    if (centerId) {
        // 특정 연수원으로 이동
        setTimeout(() => {
            const targetMarker = allMarkers.find(marker => marker.centerData.id === centerId);
            if (targetMarker) {
                map.setCenter(targetMarker.getPosition());
                map.setZoom(15);
                
                // 정보창 열기
                const content = createInfoWindowContent(targetMarker.centerData);
                infoWindowManager.openInfoWindow(map, targetMarker, content);
                
                console.log('🎯 URL 파라미터로 특정 연수원 표시:', targetMarker.getTitle());
            }
        }, 1000);
    }
};

// ===== 페이지 로드 후 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM 로드 완료 - 지도 초기화 시작');
    initMap();
});

// ===== 디버깅을 위한 전역 함수들 =====
window.debugInfo = {
    getCurrentInfoWindow: () => infoWindowManager.getCurrentInfoWindow(),
    getCurrentMarker: () => infoWindowManager.getCurrentMarker(),
    closeInfoWindow: () => infoWindowManager.closeCurrentInfoWindow(),
    getMarkerCount: () => allMarkers.length,
    getAllMarkers: () => allMarkers,
    getInfoWindowManager: () => infoWindowManager
};

// ===== 에러 처리 개선 =====
window.addEventListener('error', (event) => {
    console.error('❌ 전역 에러 발생:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ 처리되지 않은 Promise 에러:', event.reason);
});

console.log('✅ 개선된 app.js 로드 완료 - 정보창 최적화 적용됨');
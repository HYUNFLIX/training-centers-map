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

// 전역 변수
let map;
let infowindow;
let allMarkers = [];
let currentInfoWindow = null;
let currentOpenMarker = null;
let clusterer = null;

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

/**
 * 지도 초기화 함수
 */
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

    // 커스텀 정보창 설정
    infowindow = new naver.maps.InfoWindow({
        content: '<div class="loading-info">로딩중...</div>',
        backgroundColor: "#fff",
        borderWidth: 0,
        borderColor: "transparent",
        anchorSize: new naver.maps.Size(6, 6), // 화살표 크기 축소
        anchorSkew: true,
        anchorColor: "#fff",
        pixelOffset: new naver.maps.Point(10, -20),
        contentPadding: 0,
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        disableAnchor: false,
        closeButtonDisplay: false
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
};

/**
 * 로고 클릭 이벤트 설정 - 지도 초기화
 */
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
                if (currentInfoWindow) {
                    currentInfoWindow.close();
                    currentInfoWindow = null;
                    currentOpenMarker = null;
                }
                
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
            }
        });
    }
};

/**
 * URL 파라미터 처리 함수
 */
const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const centerId = urlParams.get('center');
    
    if (centerId) {
        // 지도 초기화 후 해당 연수원 찾기
        setTimeout(async () => {
            try {
                // Firestore에서 해당 연수원 데이터 가져오기
                const docRef = doc(db, "trainingCenters", centerId);
                const docSnap = await getDoc(docRef);
                
                if (docSnap.exists()) {
                    const center = docSnap.data();
                    
                    if (center.location?.lat && center.location?.lng) {
                        // 위치로 이동
                        const position = new naver.maps.LatLng(center.location.lat, center.location.lng);
                        map.setCenter(position);
                        map.setZoom(15);
                        
                        // 해당 마커 찾기
                        setTimeout(() => {
                            const marker = allMarkers.find(m => 
                                m.getTitle() === center.name && 
                                Math.abs(m.getPosition().lat() - center.location.lat) < 0.0001 && 
                                Math.abs(m.getPosition().lng() - center.location.lng) < 0.0001
                            );
                            
                            if (marker) {
                                naver.maps.Event.trigger(marker, 'click');
                            }
                        }, 500);
                    }
                }
            } catch (error) {
                console.error('연수원 정보 로드 실패:', error);
            }
        }, 1000);
    }
};

/**
 * 지도 컨트롤 이벤트 리스너 설정
 */
const setupMapControlEvents = () => {
    // 확대 버튼
    document.getElementById('zoom-in')?.addEventListener('click', () => {
        map.setZoom(map.getZoom() + 1);
    });
    
    // 축소 버튼
    document.getElementById('zoom-out')?.addEventListener('click', () => {
        map.setZoom(map.getZoom() - 1);
    });
    
    // 내 위치 버튼
    document.getElementById('current-location')?.addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const myLocation = new naver.maps.LatLng(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    map.setCenter(myLocation);
                    map.setZoom(14);
                    
                    // 현재 위치 표시 마커
                    new naver.maps.Marker({
                        position: myLocation,
                        map: map,
                        icon: {
                            content: '<div class="current-location-marker"></div>',
                            size: new naver.maps.Size(20, 20),
                            anchor: new naver.maps.Point(10, 10)
                        },
                        zIndex: 1000
                    });
                },
                (error) => {
                    console.error('위치 정보 가져오기 실패:', error);
                    alert('위치 정보를 가져올 수 없습니다. 위치 권한을 허용해주세요.');
                }
            );
        } else {
            alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
        }
    });
    
    // 전체보기 버튼
    document.getElementById('reset-map')?.addEventListener('click', () => {
        map.setCenter(new naver.maps.LatLng(36.2253017, 127.6460516));
        map.setZoom(7);
    });
};

/**
 * 필터 토글 설정
 */
const setupFilterToggle = () => {
    const filterToggle = document.querySelector('.filter-toggle');
    const filterOptions = document.querySelector('.filter-options');
    
    if (!filterToggle || !filterOptions) return;

    filterToggle.addEventListener('click', () => {
        filterOptions.style.display = filterOptions.style.display === 'block' ? 'none' : 'block';
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

/**
 * 필터 적용 함수
 */
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
};

/**
 * 마커 클러스터링 설정 함수
 */
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
                const div = element.querySelector('div');
                if (div) {
                    div.innerHTML = count;
                }
            }
        }
    });
};

/**
 * Firestore에서 연수원 데이터를 불러와 마커를 생성하고 클러스터링
 */
const loadCenters = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const markers = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            // ID 추가
            center.id = doc.id;
            
            // 위치 정보가 존재하면 마커 생성
            if (center.location?.lat && center.location?.lng) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    title: center.name, // 검색용 title
                    clickable: true,
                    centerData: center, // 연수원 데이터 저장 (필터링용)
                    icon: {
                        content: createMarkerContent(center.name),
                        size: new naver.maps.Size(200, 50),
                        anchor: new naver.maps.Point(100, 70)
                    }
                });

                // 마커 클릭 시 정보창 열기
                naver.maps.Event.addListener(marker, 'click', () => {
                    if (currentInfoWindow) {
                        currentInfoWindow.close();
                    }
                    
                    const content = createInfoWindowContent(center);
                    infowindow.setContent(content);
                    infowindow.open(map, marker);
                    currentInfoWindow = infowindow;
                    currentOpenMarker = marker;
                    
                    // 정보창이 열린 후 이벤트 리스너 등록
                    setTimeout(() => {
                        const closeBtn = document.querySelector('.info-window-close');
                        if (closeBtn) {
                            closeBtn.addEventListener('click', () => {
                                infowindow.close();
                                currentInfoWindow = null;
                                currentOpenMarker = null;
                            });
                        }
                    }, 200); // 시간을 늘려 DOM이 완전히 렌더링된 후 이벤트 리스너 등록
                });
                
                markers.push(marker);
                allMarkers.push(marker);
            }
        });

        // 마커 클러스터링 적용
        if (markers.length > 0) {
            setupMarkerClustering(markers);
        }

        // 검색 기능 초기화
        initSearch(allMarkers, map);
        
        // 지도 클릭 시 열린 정보창 닫기
        naver.maps.Event.addListener(map, 'click', () => {
            if (currentInfoWindow) {
                currentInfoWindow.close();
                currentInfoWindow = null;
                currentOpenMarker = null;
            }
        });
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        alert('연수원 데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
};

/**
 * 검색 기능 초기화 함수
 */
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
                const div = document.createElement('div');
                div.className = 'search-result-item';
                
                // 강조된 텍스트 생성
                const markerTitle = marker.getTitle();
                const highlightedTitle = markerTitle.replace(
                    new RegExp(value, 'gi'),
                    match => `<strong>${match}</strong>`
                );
                
                div.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${highlightedTitle}`;

                // 검색 결과 클릭 시 해당 마커로 이동
                div.onclick = () => {
                    map.setCenter(marker.getPosition());
                    map.setZoom(15);
                    
                    // 기존 열린 정보창 닫기
                    if (currentInfoWindow) {
                        currentInfoWindow.close();
                    }
                    
                    // 마커 클릭 이벤트 발생
                    naver.maps.Event.trigger(marker, 'click');
                    
                    // 검색 UI 정리
                    searchResults.style.display = 'none';
                    searchInput.value = markerTitle;
                    clearIcon.style.display = 'block';
                };
                searchResults.appendChild(div);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div class="search-result-empty">검색 결과가 없습니다</div>';
            searchResults.style.display = 'block';
        }
    });

    // X 버튼 클릭 시 검색창 초기화
    clearIcon.addEventListener('click', () => {
        searchInput.value = '';
        clearIcon.style.display = 'none';
        searchResults.style.display = 'none';
        searchInput.focus();
    });

    // 검색창 외부 클릭 시 자동완성 닫기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
};

// 페이지 로드 완료 시 지도 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

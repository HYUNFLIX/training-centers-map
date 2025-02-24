// Firebase 초기화
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
// 모든 마커를 저장 (검색 및 전체 표시용)
let allMarkers = [];

// 지도 초기화 함수
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.2253017, 127.6460516),
        zoom: 7,
        zoomControl: true,
        zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT
        }
    });

    // InfoWindow 기본 스타일 제거(커스텀 말풍선 형태로 표시하기 위함)
    infowindow = new naver.maps.InfoWindow({
        anchorSkew: true,
        backgroundColor: "transparent",
        borderWidth: 0,
        pixelOffset: new naver.maps.Point(10, -30)
    });

    loadCenters();
}

// 마커 클러스터링 설정 함수 (기존 코드와 동일)
function setupMarkerClustering(markers) {
    // 클러스터 아이콘들 (예시)
    const htmlMarker1 = {
        content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:12px;color:white;text-align:center;font-weight:bold;background:url(/images/m1.png);background-size:contain;"></div>',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    };
    // ... 필요한 다른 아이콘들 ...

    const clusterer = new MarkerClustering({
        minClusterSize: 2,
        maxZoom: 13,
        map: map,
        markers: markers,
        gridSize: 120,
        disableClickZoom: false,
        icons: [htmlMarker1 /*, ... 다른 아이콘들 */],
        indexGenerator: [5, 10, 20, 50, 100],
        stylingFunction: function(clusterMarker, count) {
            clusterMarker.getElement().querySelector('div').textContent = count;
        }
    });

    // 클러스터 클릭 시 확대
    naver.maps.Event.addListener(clusterer, 'clusterclick', (cluster) => {
        const markersInCluster = cluster.getMarkers();
        if (markersInCluster.length > 1) {
            const bounds = new naver.maps.LatLngBounds();
            markersInCluster.forEach(marker => bounds.extend(marker.getPosition()));
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        }
    });
}

// Firestore에서 연수원 데이터를 불러와 마커 생성
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const markers = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.location?.lat && center.location?.lng) {

                // 사용자가 원하는 말풍선 모양 (파란색 테두리 + 원 + 아래쪽 삼각형)
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    title: center.name,
                    clickable: true,
                    icon: {
                        content: `
                            <div class="marker-container" style="
                                position: relative;
                                display: flex;
                                align-items: center;
                                z-index: 10;
                                padding: 4px;
                                border: 1px solid rgba(0, 123, 255, 1);
                                border-radius: 19px;
                                background: #fff;
                                box-shadow: 0 3px 10px 0 rgba(0, 0, 0, 0.17);
                                white-space: nowrap;">
                                <!-- 왼쪽 파란 원 + 아이콘 -->
                                <div style="
                                    position: relative;
                                    width: 24px;
                                    height: 24px;
                                    border-radius: 50%;
                                    background: rgba(0, 123, 255, 1);
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    box-sizing: border-box;
                                    margin-right: 8px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" style="width: 14px; height: 14px;">
                                        <path fill="white" d="M13 13.14a1.62 1.62 0 01-1.61-1.62A1.62 1.62 0 1113 13.14zm5.9 1.5a6.3 6.3 0 001.1-3.53c0-3.64-3.14-6.6-7-6.61-3.86 0-7 2.97-7 6.6 0 1.26.38 2.48 1.12 3.58l5.5 6.64a.5.5 0 00.77 0z"></path>
                                    </svg>
                                </div>
                                <!-- 말풍선 안의 텍스트 -->
                                <span style="
                                    font-size: 14px;
                                    font-weight: bold;
                                    color: black;">
                                    ${center.name}
                                </span>
                                <!-- 말풍선 아래쪽 삼각형 -->
                                <div style="
                                    position: absolute;
                                    bottom: -10px;
                                    left: 50%;
                                    transform: translateX(-50%);
                                    width: 0;
                                    height: 0;
                                    border-left: 10px solid transparent;
                                    border-right: 10px solid transparent;
                                    border-top: 10px solid rgba(0, 123, 255, 1);">
                                </div>
                            </div>
                        `,
                        // 말풍선 크기, 앵커 위치(말풍선 아래 삼각형이 실제 좌표에 닿도록 조정)
                        size: new naver.maps.Size(200, 50),
                        anchor: new naver.maps.Point(100, 70)
                    }
                });

                // 마커 클릭 시 간단한 정보창
                naver.maps.Event.addListener(marker, 'click', () => {
                    const content = `
                        <div class="info-window">
                            <h3>${center.name}</h3>
                            <p>${center.branch || ''}</p>
                            <p>${center.basicInfo || ''}</p>
                            <div>
                                ${center.links?.naver ? `<a href="${center.links.naver}" target="_blank">네이버 지도</a>` : ''}
                                ${center.links?.website ? `<a href="${center.links.website}" target="_blank">웹사이트</a>` : ''}
                            </div>
                        </div>
                    `;
                    infowindow.setContent(content);
                    infowindow.open(map, marker);
                });

                markers.push(marker);
                allMarkers.push(marker);
            }
        });

        // 클러스터링 적용
        setupMarkerClustering(markers);

        // 검색 기능 초기화
        initSearch(markers, map);
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 검색 기능 초기화 함수
function initSearch(markers, map) {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');

    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        const results = markers.filter(marker =>
            marker.getTitle().toLowerCase().includes(value)
        );

        // 검색 결과 표시
        searchResults.innerHTML = '';
        if (value && results.length > 0) {
            results.forEach(marker => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.textContent = marker.getTitle();
                div.onclick = () => {
                    map.setCenter(marker.getPosition());
                    map.setZoom(15);
                    naver.maps.Event.trigger(marker, 'click');
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                };
                searchResults.appendChild(div);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    });

    // 검색창 외부 클릭 시 결과 숨기기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

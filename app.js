// Firebase 초기화
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDSPO1KqZg...",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.appspot.com",
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

/**
 * 지도 초기화 함수
 */
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.2253017, 127.6460516),
        zoom: 7,
        zoomControl: true,
        zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT
        }
    });

    infowindow = new naver.maps.InfoWindow({
        anchorSkew: true,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
        pixelOffset: new naver.maps.Point(20, -20)
    });

    loadCenters(); // Firestore에서 데이터 로드 후 마커 생성
}

/**
 * 마커 클러스터링 설정 함수
 */
function setupMarkerClustering(markers) {
    // 클러스터 아이콘 정의
    const htmlMarker1 = {
        content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:12px;color:white;text-align:center;font-weight:bold;background:url(/images/m1.png);background-size:contain;"></div>',
        size: new naver.maps.Size(40, 40),
        anchor: new naver.maps.Point(20, 20)
    };
    const htmlMarker2 = {
        content: '<div style="cursor:pointer;width:50px;height:50px;line-height:50px;font-size:14px;color:white;text-align:center;font-weight:bold;background:url(/images/m2.png);background-size:contain;"></div>',
        size: new naver.maps.Size(50, 50),
        anchor: new naver.maps.Point(25, 25)
    };
    const htmlMarker3 = {
        content: '<div style="cursor:pointer;width:60px;height:60px;line-height:60px;font-size:16px;color:white;text-align:center;font-weight:bold;background:url(/images/m3.png);background-size:contain;"></div>',
        size: new naver.maps.Size(60, 60),
        anchor: new naver.maps.Point(30, 30)
    };
    const htmlMarker4 = {
        content: '<div style="cursor:pointer;width:70px;height:70px;line-height:70px;font-size:18px;color:white;text-align:center;font-weight:bold;background:url(/images/m4.png);background-size:contain;"></div>',
        size: new naver.maps.Size(70, 70),
        anchor: new naver.maps.Point(35, 35)
    };
    const htmlMarker5 = {
        content: '<div style="cursor:pointer;width:80px;height:80px;line-height:80px;font-size:20px;color:white;text-align:center;font-weight:bold;background:url(/images/m5.png);background-size:contain;"></div>',
        size: new naver.maps.Size(80, 80),
        anchor: new naver.maps.Point(40, 40)
    };

    // MarkerClustering.js 라이브러리를 이용한 클러스터링 객체 생성
    const clusterer = new MarkerClustering({
        minClusterSize: 2,          // 클러스터 구성 최소 마커 수
        maxZoom: 13,                // 클러스터 해제 줌 레벨
        map: map,                   // 네이버 지도 객체
        markers: markers,           // 마커 배열
        gridSize: 120,              // 클러스터링 그리드 크기 (픽셀)
        disableClickZoom: false,    // 클러스터 클릭 시 확대 동작 활성화
        icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5],
        indexGenerator: [5, 10, 20, 50, 100],
        stylingFunction: function(clusterMarker, count) {
            // 클러스터 내부 마커 개수를 아이콘 div에 표시
            clusterMarker.getElement().querySelector('div').textContent = count;
        }
    });

    // 클러스터 클릭 시 해당 클러스터 내의 마커들 영역으로 확대
    naver.maps.Event.addListener(clusterer, 'clusterclick', (cluster) => {
        const markersInCluster = cluster.getMarkers();
        if (markersInCluster.length > 1) {
            const bounds = new naver.maps.LatLngBounds();
            markersInCluster.forEach(marker => bounds.extend(marker.getPosition()));
            map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        } else {
            console.warn("클러스터에 포함된 마커가 1개 이하입니다.");
        }
    });
}

/**
 * Firestore에서 연수원 데이터를 불러와 마커를 생성하고 클러스터링
 */
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const markers = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            // 위치 정보가 존재하면 마커 생성
            if (center.location?.lat && center.location?.lng) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    title: center.name, // 검색용 title
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
                <div style="
                    position: relative;
                    width: 24px;
                    height: 24px;
                    border: 1px solid rgba(0, 0, 0, 0);
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
                <span style="
                    font-size: 14px;
                    font-weight: bold;
                    color: black;">${center.name}</span>
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
                        size: new naver.maps.Size(200, 50),
                        anchor: new naver.maps.Point(100, 70)
                    }
                });

                // 마커 클릭 시 정보창 열기
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

                positions.push(marker);
            }
        });

        // 마커 클러스터링 적용
        setupMarkerClustering(markers);

        // 검색 기능 초기화
        initSearch(markers, map);
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

/**
 * 검색 기능 초기화 함수
 */
function initSearch(markers, map) {
    // 검색 입력, X 버튼, 검색결과 컨테이너
    const searchInput = document.querySelector('.search-input');
    const clearIcon = document.querySelector('.clear-icon');
    const searchResults = document.querySelector('.search-results');

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
                div.textContent = marker.getTitle();

                // 검색 결과 클릭 시 해당 마커로 이동
                div.onclick = () => {
                    map.setCenter(marker.getPosition());
                    map.setZoom(15);
                    naver.maps.Event.trigger(marker, 'click');
                    searchResults.style.display = 'none';
                    searchInput.value = marker.getTitle();
                    clearIcon.style.display = 'block';
                };
                searchResults.appendChild(div);
            });
            searchResults.style.display = 'block';
        } else {
            // 결과가 없으면 자동완성 닫기
            searchResults.style.display = 'none';
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
}

// 페이지 로드 완료 시 지도 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

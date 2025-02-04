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
// Firestore에서 불러온 연수원 데이터를 저장 (검색 시 사용)
let centersData = [];
// 모든 마커를 저장 (전체 데이터를 보여줄 때 사용)
let allMarkers = [];
// 현재 사용 중인 클러스터러 객체 (필요 시 관리)
let currentClusterer = null;

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

    infowindow = new naver.maps.InfoWindow({
        anchorSkew: true,
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
        pixelOffset: new naver.maps.Point(20, -20)
    });

    // 연수원 데이터 로드
    loadCenters();
}

// 마커 클러스터링 설정 함수
function setupMarkerClustering(positions) {
    // (필요한 경우 이전 클러스터러 객체 제거 로직을 추가할 수 있음)
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

    // 클러스터링 객체 생성 (MarkerClustering.js 라이브러리 사용)
    currentClusterer = new MarkerClustering({
        minClusterSize: 2,          // 클러스터를 구성할 최소 마커 수
        maxZoom: 13,                // 클러스터 해제 줌 레벨
        map: map,                   // 네이버 지도 객체
        markers: positions,         // 마커 배열
        gridSize: 120,              // 클러스터링 그리드 크기 (픽셀)
        disableClickZoom: false,    // 클러스터 클릭 시 확대 동작 활성화
        icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5],
        indexGenerator: [5, 10, 20, 50, 100],
        stylingFunction: function(clusterMarker, count) {
            clusterMarker.getElement().querySelector('div').textContent = count;
        }
    });

    // 클러스터 클릭 시 클러스터 내 마커의 영역으로 확대
    naver.maps.Event.addListener(currentClusterer, 'clusterclick', (cluster) => {
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

// 연수원 데이터를 Firestore에서 불러와 마커 생성 및 클러스터링하는 함수
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const positions = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.location?.lat && center.location?.lng) {
                // 검색에 사용할 데이터 배열에 저장
                centersData.push(center);

                // 마커 생성
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
            <!-- 마커 아이콘 -->
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
            <!-- 텍스트 -->
            <span style="
                font-size: 14px;
                font-weight: bold;
                color: black;">${center.name}</span>
            <!-- 화살표 -->
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
                allMarkers.push(marker);
            }
        });

        // 전체 데이터를 클러스터링하여 지도에 표시
        setupMarkerClustering(positions);
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 검색어를 이용해 연수원 데이터를 필터링하고 클러스터링하는 함수
function performSearch(searchTerm) {
    // 기존 마커들을 지도에서 제거
    allMarkers.forEach(marker => marker.setMap(null));

    // 검색어(대소문자 구분 없이)가 포함된 연수원 데이터 필터링
    const filteredCenters = centersData.filter(center =>
        center.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 필터링된 데이터로 새 마커 생성
    const filteredMarkers = filteredCenters.map(center => {
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
            <!-- 마커 아이콘 -->
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
            <!-- 텍스트 -->
            <span style="
                font-size: 14px;
                font-weight: bold;
                color: black;">${center.name}</span>
            <!-- 화살표 -->
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
        return marker;
    });

    // 필터링된 마커로 클러스터링 적용
    setupMarkerClustering(filteredMarkers);
}

// 페이지 로드 시 초기화 (DOMContentLoaded 이벤트)
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

// jQuery를 사용한 검색 입력 이벤트 핸들러
$(document).ready(function(){
    $('.search-input').on('keyup', function() {
        const searchTerm = $(this).val().trim();
        if (searchTerm === '') {
            // 검색어가 없으면 전체 마커로 클러스터링
            setupMarkerClustering(allMarkers);
        } else {
            performSearch(searchTerm);
        }
    });
});

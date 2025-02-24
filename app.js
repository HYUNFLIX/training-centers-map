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

    // InfoWindow 스타일을 직접 꾸미기 위해 기본 테두리/배경 제거
    infowindow = new naver.maps.InfoWindow({
        anchorSkew: true,
        backgroundColor: "transparent", // 말풍선 모양을 HTML로 구현하기 위해 투명 처리
        borderWidth: 0,                 // 기본 테두리 제거
        pixelOffset: new naver.maps.Point(10, -30) // 말풍선 꼭지점 위치 조정
    });

    loadCenters();
}

// 마커 클러스터링 설정 함수
function setupMarkerClustering(markers) {
    // 클러스터 아이콘 정의 (기존 예시와 동일)
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

// 연수원 데이터를 Firestore에서 불러와 마커를 생성하고 클러스터링하는 함수
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const markers = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.location?.lat && center.location?.lng) {
                // 원하는 말풍선 형태의 마커(HTML) 적용
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    title: center.name,
                    clickable: true,
                    icon: {
                        content: `
                          <div class="UfBAj">
                            <div class="QMt1k">
                              <div class="f2YRX">
                                <div class="DEyxL">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 26" class="OIYTG" style="width: 14px; height: 14px;">
                                    <path fill-rule="evenodd" d="M13 13.14a1.62 1.62 0 01-1.61-1.62A1.62 1.62 0 1113 13.14zm5.9 1.5a6.3 6.3 0 001.1-3.53c0-3.64-3.14-6.6-7-6.61-3.86 0-7 2.97-7 6.6 0 1.26.38 2.48 1.12 3.58l5.5 6.64a.5.5 0 00.77 0z" clip-rule="evenodd"></path>
                                  </svg>
                                </div>
                                <div class="PkreH">
                                  <div class="wObwH">
                                    <span class="Ypcqn">${center.name}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div class="lMhqd"></div>
                          </div>
                        `,
                        size: new naver.maps.Size(70, 40),
                        anchor: new naver.maps.Point(10, 40)
                    }
                });

                // 마커 클릭 시 커스텀 말풍선(InfoWindow) 열기
                naver.maps.Event.addListener(marker, 'click', () => {
                    // InfoWindow에 표시할 말풍선 형태 HTML
                    const content = `
                      <div style="
                        position: relative;
                        padding: 14px 16px;
                        background: #fff;
                        border: 1px solid #ccc;
                        border-radius: 6px;
                        box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                        font-size: 14px;
                        color: #333;
                      ">
                        <h3 style="
                          margin: 0 0 6px 0;
                          font-size: 15px;
                          font-weight: bold;
                          color: #111;
                        ">
                          ${center.name}
                        </h3>
                        <p style="margin: 4px 0;">${center.branch || ''}</p>
                        <p style="margin: 4px 0;">${center.basicInfo || ''}</p>
                        <div style="margin-top: 8px;">
                          ${center.links?.naver 
                            ? `<a href="${center.links.naver}" target="_blank" style="color:#0c43b7; margin-right:10px;">네이버 지도</a>` 
                            : ''
                          }
                          ${center.links?.website 
                            ? `<a href="${center.links.website}" target="_blank" style="color:#0c43b7;">웹사이트</a>`
                            : ''
                          }
                        </div>

                        <!-- 아래쪽 화살표 (회색 테두리 + 흰색 내부) -->
                        <div style="
                          position: absolute;
                          bottom: -10px;
                          left: 20px;
                          width: 0;
                          height: 0;
                          border-left: 10px solid transparent;
                          border-right: 10px solid transparent;
                          border-top: 10px solid #ccc;
                        "></div>
                        <div style="
                          position: absolute;
                          bottom: -9px;
                          left: 20px;
                          width: 0;
                          height: 0;
                          border-left: 9px solid transparent;
                          border-right: 9px solid transparent;
                          border-top: 9px solid #fff;
                        "></div>
                      </div>
                    `;
                    infowindow.setContent(content);
                    infowindow.open(map, marker);
                });

                markers.push(marker);
                allMarkers.push(marker);
            }
        });

        // 클러스터링 적용 (전체 마커 표시)
        setupMarkerClustering(markers);

        // 검색 기능 초기화 (검색 대상은 Firestore에서 로드한 마커 배열)
        initSearch(markers, map);
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 검색 기능 초기화 함수 (기존 로직 동일)
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
                    // 마커 클릭 이벤트 강제 발생
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

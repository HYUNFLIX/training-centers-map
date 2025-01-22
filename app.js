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

// 지도 초기화
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

    loadCenters();
}

// 마커 클러스터링 설정
function setupMarkerClustering(positions) {
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

    const clusterer = new MarkerClustering({
        minClusterSize: 2, // 클러스터 최소 크기
        maxZoom: 13,       // 클러스터 해제 줌 레벨
        map: map,          // 네이버 지도 객체
        markers: positions, // 마커 배열
        gridSize: 120,     // 클러스터 크기
        icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5], // 5단계 아이콘
        indexGenerator: [5, 10, 20, 50, 100], // 클러스터 크기 구간
        stylingFunction: function(clusterMarker, count) {
            clusterMarker.getElement().querySelector('div').textContent = count;
        }
    });

    // 클러스터 클릭 이벤트 추가
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

// 연수원 데이터 로드
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const positions = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.location?.lat && center.location?.lng) {
                const marker = new naver.maps.Marker({
                    position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                    title: center.name,
                    clickable: true,
                   icon: {
    content: `
        <div style="
            position: relative;
            display: flex;
            align-items: center;
            padding: 10px 15px;
            background: white;
            color: black;
            font-size: 14px;
            font-weight: bold;
            border: 2px solid #007bff;
            border-radius: 20px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
            white-space: nowrap;">
            <div style="
                width: 20px;
                height: 20px;
                background: #007bff;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                margin-right: 10px;">
                <div style="
                    width: 10px;
                    height: 10px;
                    background: white;
                    border-radius: 50%;">
                </div>
            </div>
            ${center.name} <!-- 연수원명 표시 -->
            <div style="
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                border-top: 10px solid #007bff;">
            </div>
        </div>
    `,
    size: new naver.maps.Size(150, 50), // 말풍선 크기
    anchor: new naver.maps.Point(75, 70) // 말풍선 위치 조정
}


                });

                // 마커 클릭 이벤트
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

        // 클러스터링 적용
        setupMarkerClustering(positions);
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

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
let markers = [];
let markerClustering;

// 클러스터 마커 스타일 정의
const htmlMarker1 = {
    content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ff6b6b;border-radius:50%;"></div>',
    size: new naver.maps.Size(40, 40),
    anchor: new naver.maps.Point(20, 20)
};

const htmlMarker2 = {
    content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ff8787;border-radius:50%;"></div>',
    size: new naver.maps.Size(40, 40),
    anchor: new naver.maps.Point(20, 20)
};

const htmlMarker3 = {
    content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ffa8a8;border-radius:50%;"></div>',
    size: new naver.maps.Size(40, 40),
    anchor: new naver.maps.Point(20, 20)
};

const htmlMarker4 = {
    content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ffc9c9;border-radius:50%;"></div>',
    size: new naver.maps.Size(40, 40),
    anchor: new naver.maps.Point(20, 20)
};

const htmlMarker5 = {
    content: '<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ffd8d8;border-radius:50%;"></div>',
    size: new naver.maps.Size(40, 40),
    anchor: new naver.maps.Point(20, 20)
};

// 지도 초기화
function initMap() {
    map = new naver.maps.Map('map', {
        zoom: 7,
        center: new naver.maps.LatLng(36.5, 127.5),
        zoomControl: true,
        zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
            style: naver.maps.ZoomControlStyle.SMALL
        }
    });

    infowindow = new naver.maps.InfoWindow({
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 20,
        anchorSize: new naver.maps.Size(30, 30),
        anchorSkew: true,
        anchorColor: "#fff"
    });
}

// 마커 생성 함수
function createMarker(center) {
    const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(center.location.lat, center.location.lng),
        map: map
    });

    naver.maps.Event.addListener(marker, 'click', () => {
        const content = `
            <div class="info-window">
                <h3>${center.name}</h3>
                <p>${center.branch || ''}</p>
                <p>${center.basicInfo || ''}</p>
                <div>
                    <a href="${center.links?.naver}" target="_blank">네이버 지도</a>
                    <a href="${center.links?.website}" target="_blank">웹사이트</a>
                </div>
            </div>
        `;
        
        infowindow.setContent(content);
        infowindow.open(map, marker);
    });

    return marker;
}

// 연수원 데이터 로드
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        
        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.location?.lat && center.location?.lng) {
                const marker = createMarker(center);
                markers.push(marker);
            }
        });

        // 마커 클러스터링 설정
        markerClustering = new MarkerClustering({
            minClusterSize: 2,
            maxZoom: 12,
            map: map,
            markers: markers,
            disableClickZoom: false,
            gridSize: 120,
            icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5],
            indexGenerator: [10, 100, 200, 500, 1000],
            stylingFunction: function(clusterMarker, count) {
                const element = clusterMarker.getElement();
                const div = element.querySelector('div');
                if (div) {
                    div.textContent = count;
                }
            }
        });

        // 검색 기능 초기화
        initSearch();
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 검색 기능
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    
    searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();
        if (!searchText) return;

        getDocs(collection(db, "trainingCenters"))
            .then((querySnapshot) => {
                querySnapshot.forEach((doc) => {
                    const center = doc.data();
                    if (center.name.toLowerCase().includes(searchText)) {
                        const position = new naver.maps.LatLng(center.location.lat, center.location.lng);
                        map.setCenter(position);
                        map.setZoom(12);
                    }
                });
            })
            .catch((error) => {
                console.error('검색 중 오류:', error);
            });
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadCenters();
});

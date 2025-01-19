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
    const clusterer = new naver.maps.MarkerClustering({
        minClusterSize: 2, // 클러스터를 만들 최소 마커 개수
        maxZoom: 13,       // 이 줌 이상에서는 클러스터가 해제돼요
        map: map,          // 네이버 지도 객체
        markers: positions, // 마커 배열
        gridSize: 120,     // 클러스터 크기
        icons: [
            {
                content: '<div style="width:40px;height:40px;line-height:40px;text-align:center;color:white;background:blue;border-radius:20px;">$[count]</div>',
                size: new naver.maps.Size(40, 40), // 아이콘 크기
                anchor: new naver.maps.Point(20, 20) // 아이콘 위치
            }
        ]
    });

    // 클러스터 클릭 이벤트 추가
    naver.maps.Event.addListener(clusterer, 'clusterclick', (cluster) => {
        const bounds = cluster.getBounds(); // 클러스터 영역 가져오기
        map.fitBounds(bounds); // 클러스터 영역으로 지도 확대
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
                    clickable: true
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

// 검색 기능
function initSearch() {
    const searchInput = document.querySelector('.search-input');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();

        // 디바운싱 적용
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (searchText) {
                searchTrainingCenters(searchText);
            }
        }, 300);
    });
}

async function searchTrainingCenters(searchText) {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        let found = false;

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.name.toLowerCase().includes(searchText)) {
                const position = new naver.maps.LatLng(center.location.lat, center.location.lng);
                map.setCenter(position);
                map.setZoom(13);
                found = true;
            }
        });

        if (!found) {
            console.log('검색 결과가 없습니다.');
        }
    } catch (error) {
        console.error('검색 실패:', error);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
});

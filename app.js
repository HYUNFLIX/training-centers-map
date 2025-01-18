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
let markers = [];
let markerClustering;

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
}

// 마커 생성 함수
function createMarker(center) {
    const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(center.location.lat, center.location.lng),
        map: map,
        title: center.name
    });

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
}

// 연수원 데이터 로드 및 클러스터링 초기화
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        markers = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.location?.lat && center.location?.lng) {
                const marker = createMarker(center);
                markers.push(marker);
            }
        });

        // 마커 클러스터링 설정
        if (markers.length > 0) {
            markerClustering = new MarkerClustering({
                minClusterSize: 2,
                maxZoom: 13,
                map: map,
                markers: markers,
                disableClickZoom: false,
                gridSize: 120,
                icons: []
            });
        }

        // 검색 기능 초기화
        initSearch();
    } catch (error) {
        console.error('데이터 로드 실패:', error);
        console.error('Error details:', error.message);
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
    // 지도 초기화
    initMap();
    // 데이터 로드
    loadCenters();
});

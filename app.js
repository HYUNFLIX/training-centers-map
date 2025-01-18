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
let markers;
const centersList = new Map(); // 연수원 데이터 저장용

// 지도 초기화
function initMap() {
    map = L.map('map').setView([36.5, 127.5], 7);
    
    // OpenStreetMap 타일 레이어 추가
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // 마커 클러스터 그룹 초기화
    markers = L.markerClusterGroup();
    map.addLayer(markers);
}

// 마커 생성 함수
function createMarker(center) {
    const marker = L.marker([center.location.lat, center.location.lng]);
    
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
    
    marker.bindPopup(content);
    return marker;
}

// 연수원 데이터 로드
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        
        querySnapshot.forEach((doc) => {
            const center = doc.data();
            centersList.set(doc.id, center); // 데이터 저장

            if (center.location?.lat && center.location?.lng) {
                const marker = createMarker(center);
                markers.addLayer(marker);
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

        // 연수원 검색
        for (const [id, center] of centersList) {
            if (center.name.toLowerCase().includes(searchText)) {
                map.setView([center.location.lat, center.location.lng], 12);
                break;
            }
        }
    });
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadCenters();
});

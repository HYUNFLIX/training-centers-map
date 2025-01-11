// Firebase 설정
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

// 네이버 지도 초기화
let map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(36.5, 127.5),
    zoom: 7,
    zoomControl: true,
    zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT
    }
});

// InfoWindow 객체 생성
let infowindow = new naver.maps.InfoWindow({
    anchorSkew: true,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    pixelOffset: new naver.maps.Point(20, -20)
});

// 연수원 데이터 로드 및 마커 생성
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        querySnapshot.forEach((doc) => {
            const center = doc.data();
            
            if (!center.location?.lat || !center.location?.lng) return;

            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                map: map,
                title: center.name
            });

            naver.maps.Event.addListener(marker, 'click', function() {
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

        // 데이터베이스에서 검색
        searchTrainingCenters(searchText);
    });
}

async function searchTrainingCenters(searchText) {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.name.toLowerCase().includes(searchText)) {
                // 검색된 위치로 지도 이동
                const position = new naver.maps.LatLng(center.location.lat, center.location.lng);
                map.setCenter(position);
                map.setZoom(12);
            }
        });
    } catch (error) {
        console.error('검색 실패:', error);
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', loadCenters);

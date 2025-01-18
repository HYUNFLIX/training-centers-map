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
let markerClustering; // 클러스터링 객체 추가


// 지도 초기화
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.5, 127.5),
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

// 마커 클러스터링 스타일 정의
const clustererStyles = {
    // 클러스터 아이콘의 배경색
    background: '#5347AA',
    // 클러스터 아이콘의 테두리색
    border: '2px solid #FFFFFF',
    // 클러스터 아이콘의 텍스트색
    color: '#fff',
    // 클러스터 아이콘의 너비
    width: '36px',
    // 클러스터 아이콘의 높이
    height: '36px',
    // 클러스터 아이콘의 라인높이
    lineHeight: '34px',
    // 클러스터 아이콘의 텍스트 정렬
    textAlign: 'center',
    // 클러스터 아이콘의 모서리 둥글기
    borderRadius: '50%',
    // 글씨 크기
    fontSize: '14px',
    // 글씨 굵기
    fontWeight: 'bold'
};

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

// 연수원 데이터 로드 함수 수정
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const markers = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (center.location?.lat && center.location?.lng) {
                const marker = createMarker(center);
                markers.push(marker);
            }
        });

        // 기존 클러스터링이 있다면 제거
        if (markerClustering) {
            markerClustering.destroy();
        }

        // 새로운 클러스터링 생성
        markerClustering = new MarkerClustering({
            map: map,
            markers: markers,
            minClusterSize: 2,
            maxZoom: 13,
            gridSize: 120,
            icons: [
                {
                    content: createClusterIcon(0),
                    size: new naver.maps.Size(36, 36),
                    anchor: new naver.maps.Point(18, 18)
                }
            ],
            stylingFunction: function(clusterMarker, count) {
                clusterMarker.setElement(createClusterIcon(count));
            }
        });

        // 검색 기능 초기화
        initSearch();
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 클러스터 아이콘 생성 함수 추가
function createClusterIcon(count) {
    return `
        <div style="
            cursor: pointer;
            background: #5347AA;
            border: 2px solid #FFFFFF;
            color: #fff;
            width: 36px;
            height: 36px;
            line-height: 34px;
            text-align: center;
            border-radius: 50%;
            font-size: 14px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            ${count}
        </div>
    `;
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
document.addEventListener('DOMContentLoaded', () => {
    // 지도 초기화
    initMap();
    // 데이터 로드
    loadCenters();
});

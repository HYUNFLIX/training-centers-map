import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.firebasestorage.app",
    messagingSenderId: "943690141587",
    appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 지도 초기화 함수
function initMap() {
    let map = null;
    try {
        map = new naver.maps.Map('map', {
            center: new naver.maps.LatLng(36.5, 127.5),
            zoom: 7,
            zoomControl: true,
            zoomControlOptions: {
                position: naver.maps.Position.TOP_RIGHT
            }
        });
        loadCenters(map);
    } catch (error) {
        console.error('지도 초기화 실패:', error);
    }
}

// 연수원 데이터 로드 및 마커 생성
async function loadCenters(map) {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        const markers = [];

        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (!center.location?.lat || !center.location?.lng) return;

            const marker = new naver.maps.Marker({
                position: new naver.maps.LatLng(center.location.lat, center.location.lng),
                map: map,
                title: center.name
            });

            const infoContent = `
                <div class="popup-content">
                    <h3>${center.name}</h3>
                    <p>${center.branch || ''}</p>
                    <p>${center.basicInfo || ''}</p>
                </div>
            `;

            const infoWindow = new naver.maps.InfoWindow({
                content: infoContent,
                backgroundColor: "#fff",
                borderColor: "#888",
                borderWidth: 1,
                anchorSize: new naver.maps.Size(10, 10),
                anchorSkew: true,
                pixelOffset: new naver.maps.Point(0, -5)
            });

            naver.maps.Event.addListener(marker, 'click', function() {
                if (infoWindow.getMap()) {
                    infoWindow.close();
                } else {
                    infoWindow.open(map, marker);
                }
            });

            markers.push(marker);
        });

        // 검색 기능 초기화
        initSearch(markers, map);
    } catch (error) {
        console.error('데이터 로드 실패:', error);
    }
}

// 검색 기능 초기화
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
                    marker.trigger('click');
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

// 주소 기반 위도 경도 가져오기
async function fetchCoordinates(address) {
    const apiKey = "YOUR_NAVER_MAPS_API_KEY"; // 네이버 지도 API 키
    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
        headers: {
            "X-NCP-APIGW-API-KEY-ID": "YOUR_CLIENT_ID",
            "X-NCP-APIGW-API-KEY": apiKey,
        },
    });
    const data = await response.json();
    if (data.addresses && data.addresses.length > 0) {
        return {
            lat: parseFloat(data.addresses[0].y),
            lng: parseFloat(data.addresses[0].x),
        };
    } else {
        throw new Error("주소를 찾을 수 없습니다.");
    }
}

// 지도 API 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    const waitForMap = setInterval(() => {
        if (window.naver && window.naver.maps) {
            clearInterval(waitForMap);
            initMap();
        }
    }, 100);

    // 주소 입력 시 자동으로 위도와 경도 가져오기
    const branchInput = document.getElementById('centerBranch');
    const latInput = document.getElementById('centerLat');
    const lngInput = document.getElementById('centerLng');

    if (branchInput && latInput && lngInput) {
        branchInput.addEventListener('blur', async () => {
            try {
                const coordinates = await fetchCoordinates(branchInput.value);
                latInput.value = coordinates.lat;
                lngInput.value = coordinates.lng;
            } catch (error) {
                console.error("위치 검색 실패:", error);
                alert("주소를 찾을 수 없습니다. 정확히 입력해 주세요.");
            }
        });
    }
});

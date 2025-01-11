import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.appspot.storage.googleapis.com",
    messagingSenderId: "943690141587",
    appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let marker;
let searchResults = [];

// 지도 초기화 함수
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.5, 127.5),
        zoom: 7,
        zoomControl: true,
        zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT
        }
    });

    // 지도 클릭 이벤트 추가
    naver.maps.Event.addListener(map, 'click', function(e) {
        updateMarkerPosition(e.coord);
        updateLocationDisplay(e.coord);
    });
}

// 주소 자동완성 및 검색 함수
window.searchAddress = function() {
    const address = document.getElementById('address').value;
    const errorElement = document.getElementById('addressError');
    const resultsContainer = document.getElementById('searchResults');
    
    if (!address) {
        showAddressError('주소를 입력해 주세요.');
        return;
    }

    // 로딩 상태 표시
    document.getElementById('searchButton').disabled = true;
    document.getElementById('searchButton').innerHTML = `
        <svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        검색 중...
    `;

    const geocoder = new naver.maps.Service.Geocoder();
    
    geocoder.geocode({
        query: address
    }, function(status, response) {
        // 검색 버튼 상태 복원
        document.getElementById('searchButton').disabled = false;
        document.getElementById('searchButton').textContent = '검색';

        if (status === naver.maps.Service.Status.ERROR) {
            showAddressError('주소 검색 중 오류가 발생했습니다. 다시 시도해 주세요.');
            return;
        }

        if (!response || !response.v2 || !response.v2.addresses || response.v2.addresses.length === 0) {
            showAddressError('검색된 주소가 없습니다. 다른 주소로 검색해 주세요.');
            resultsContainer.innerHTML = '';
            return;
        }

        searchResults = response.v2.addresses;
        displaySearchResults(searchResults);
        hideAddressError();

        // 첫 번째 결과로 지도 이동
        const firstResult = searchResults[0];
        const point = new naver.maps.LatLng(firstResult.y, firstResult.x);
        moveToLocation(point);
    });
};

// 검색 결과 표시 함수
function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    container.innerHTML = '';
    container.classList.remove('hidden');

    results.forEach((result, index) => {
        const div = document.createElement('div');
        div.className = 'p-2 hover:bg-gray-100 cursor-pointer';
        div.textContent = result.roadAddress || result.jibunAddress;
        div.onclick = () => {
            const point = new naver.maps.LatLng(result.y, result.x);
            moveToLocation(point);
            container.classList.add('hidden');
        };
        container.appendChild(div);
    });
}

// 위치 이동 및 마커 업데이트 함수
function moveToLocation(point) {
    map.setCenter(point);
    map.setZoom(15);
    updateMarkerPosition(point);
    updateLocationDisplay(point);
}

// 마커 위치 업데이트
function updateMarkerPosition(point) {
    if (!marker) {
        marker = new naver.maps.Marker({
            position: point,
            map: map,
            draggable: true // 마커 드래그 가능
        });

        // 마커 드래그 이벤트
        naver.maps.Event.addListener(marker, 'dragend', function() {
            const position = marker.getPosition();
            updateLocationDisplay(position);
        });
    } else {
        marker.setPosition(point);
    }
}

// 위치 정보 표시 업데이트
function updateLocationDisplay(point) {
    const locationInfo = document.getElementById('locationInfo');
    locationInfo.textContent = `위도: ${point.lat().toFixed(6)}, 경도: ${point.lng().toFixed(6)}`;
    locationInfo.classList.remove('hidden');
}

function showAddressError(message) {
    const errorElement = document.getElementById('addressError');
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
}

function hideAddressError() {
    const errorElement = document.getElementById('addressError');
    errorElement.classList.add('hidden');
}

// 폼 제출 이벤트 처리
document.addEventListener('DOMContentLoaded', function() {
    initMap();

    const form = document.getElementById('centerForm');
    const submitButton = document.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!marker) {
            showError('지도에서 위치를 선택해주세요.');
            return;
        }

        // 폼 유효성 검사
        const requiredFields = ['name', 'branch', 'basicInfo', 'naverLink', 'websiteLink'];
        let isValid = true;
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (!input.value.trim()) {
                input.classList.add('border-red-500');
                isValid = false;
            } else {
                input.classList.remove('border-red-500');
            }
        });

        if (!isValid) {
            showError('모든 필수 항목을 입력해주세요.');
            return;
        }

        try {
            submitButton.disabled = true;
            submitButton.innerHTML = `
                <svg class="animate-spin h-5 w-5 mr-2 inline" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                등록 중...
            `;

            const position = marker.getPosition();
            const centerData = {
                name: document.getElementById('name').value.trim(),
                branch: document.getElementById('branch').value.trim(),
                basicInfo: document.getElementById('basicInfo').value.trim(),
                links: {
                    naver: document.getElementById('naverLink').value.trim(),
                    website: document.getElementById('websiteLink').value.trim()
                },
                location: {
                    lat: position.lat(),
                    lng: position.lng()
                },
                createdAt: new Date()
            };

            await addDoc(collection(db, "trainingCenters"), centerData);
            showSuccess('연수원이 성공적으로 추가되었습니다.');
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1500);
        } catch (error) {
            console.error('등록 실패:', error);
            showError('등록에 실패했습니다. 다시 시도해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = '연수원 등록';
        }
    });
});

// 토스트 메시지 표시 함수
function showSuccess(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden', 'bg-red-500');
    toast.classList.add('bg-green-500');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showError(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden', 'bg-green-500');
    toast.classList.add('bg-red-500');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

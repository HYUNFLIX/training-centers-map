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
}

// 주소 검색 함수
window.searchAddress = function() {
    const address = document.getElementById('address').value;
    const errorElement = document.getElementById('addressError');
    
    if (!address) {
        showAddressError('주소를 입력해 주세요.');
        return;
    }

    const geocoder = new naver.maps.Service.Geocoder();
    
    geocoder.geocode({
        query: address
    }, function(status, response) {
        if (status === naver.maps.Service.Status.ERROR) {
            showAddressError('주소 검색 중 오류가 발생했습니다.');
            return;
        }

        if (!response || !response.v2 || !response.v2.addresses || response.v2.addresses.length === 0) {
            showAddressError('검색된 주소가 없습니다. 주소를 다시 확인해 주세요.');
            return;
        }

        const item = response.v2.addresses[0];
        const point = new naver.maps.LatLng(item.y, item.x);
        
        map.setCenter(point);
        map.setZoom(15);
        updateMarkerPosition(point);
        hideAddressError();
    });
};

// 마커 위치 업데이트
function updateMarkerPosition(point) {
    if (!marker) {
        marker = new naver.maps.Marker({
            position: point,
            map: map
        });
    } else {
        marker.setPosition(point);
    }
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
    // 지도 초기화
    initMap();

    // 폼 제출 이벤트 리스너
    document.getElementById('centerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!marker) {
            alert('지도에서 위치를 선택해주세요.');
            return;
        }

        try {
            const position = marker.getPosition();
            const centerData = {
                name: document.getElementById('name').value,
                branch: document.getElementById('branch').value,
                basicInfo: document.getElementById('basicInfo').value,
                links: {
                    naver: document.getElementById('naverLink').value,
                    website: document.getElementById('websiteLink').value
                },
                location: {
                    lat: position.lat(),
                    lng: position.lng()
                },
                createdAt: new Date()
            };

            await addDoc(collection(db, "trainingCenters"), centerData);
            alert('연수원이 추가되었습니다.');
            window.location.href = '../index.html';
        } catch (error) {
            console.error('등록 실패:', error);
            alert('등록에 실패했습니다. 다시 시도해주세요.');
        }
    });
});

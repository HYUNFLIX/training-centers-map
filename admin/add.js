import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase 설정
const firebaseConfig = {
    // 기존 설정 유지
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let marker;

// 지도 초기화
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.5, 127.5),
        zoom: 7
    });

    // 지도 클릭 이벤트
    naver.maps.Event.addListener(map, 'click', function(e) {
        updateMarkerPosition(e.coord);
    });
}

// 주소 검색
window.searchAddress = function() {
    const address = document.getElementById('address').value;
    naver.maps.Service.geocode({
        query: address
    }, function(status, response) {
        if (status === naver.maps.Service.Status.ERROR) {
            alert('주소를 찾을 수 없습니다.');
            return;
        }
        
        const result = response.v2.addresses[0];
        const latlng = new naver.maps.LatLng(result.y, result.x);
        
        map.setCenter(latlng);
        map.setZoom(15);
        updateMarkerPosition(latlng);
    });
}

// 마커 위치 업데이트
function updateMarkerPosition(latlng) {
    if (!marker) {
        marker = new naver.maps.Marker({
            position: latlng,
            map: map,
            draggable: true
        });
    } else {
        marker.setPosition(latlng);
    }
}

// 폼 제출
document.getElementById('centerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!marker) {
        alert('지도에서 위치를 선택해주세요.');
        return;
    }

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

    try {
        await addDoc(collection(db, "trainingCenters"), centerData);
        alert('연수원이 추가되었습니다.');
        window.location.href = '/admin/dashboard.html';
    } catch (error) {
        console.error('등록 실패:', error);
        alert('등록에 실패했습니다.');
    }
});

// 페이지 로드 시 지도 초기화
document.addEventListener('DOMContentLoaded', initMap);

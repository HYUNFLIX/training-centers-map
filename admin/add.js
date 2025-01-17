import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.appspot.com",
    messagingSenderId: "943690141587",
    appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 인증 상태 확인
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // 로그인되지 않은 경우 로그인 페이지로 리디렉션
        window.location.href = '/admin/login.html';
    }
});

let map;
let marker;

// 지도 초기화
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.5, 127.5),
        zoom: 7
    });

    // 지도 클릭 이벤트
    naver.maps.Event.addListener(map, 'click', function (e) {
        updateMarker(e.coord);
    });
}

// 마커 업데이트 함수
function updateMarker(coord) {
    if (!marker) {
        marker = new naver.maps.Marker({
            position: coord,
            map: map,
            draggable: true
        });
    } else {
        marker.setPosition(coord);
    }
}

// 주소 검색
document.getElementById('searchButton').addEventListener('click', function () {
    const address = document.getElementById('address').value;

    if (!address) {
        alert('주소를 입력해주세요.');
        return;
    }

    naver.maps.Service.geocode({ query: address }, function (status, response) {
        if (status !== naver.maps.Service.Status.OK) {
            alert('주소 검색에 실패했습니다. 다시 시도해주세요.');
            console.error('Geocode Error:', response);
            return;
        }

        const result = response.v2.addresses[0]; // 첫 번째 검색 결과
        const point = new naver.maps.LatLng(result.y, result.x); // 위도와 경도
        map.setCenter(point); // 지도 중심 이동
        updateMarker(point); // 마커 업데이트
    });
});

// 폼 제출
document.getElementById('centerForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!marker) {
        alert('지도에서 위치를 선택해주세요.');
        return;
    }

    const position = marker.getPosition();
    const data = {
        name: document.getElementById('name').value.trim(),
        branch: document.getElementById('branch').value.trim(),
        location: {
            lat: position.lat(),
            lng: position.lng()
        }
    };

    try {
        await addDoc(collection(db, "trainingCenters"), data);
        alert('연수원이 성공적으로 추가되었습니다!');
        document.getElementById('centerForm').reset();
        marker.setMap(null); // 마커 초기화
        marker = null;
    } catch (error) {
        console.error('Error adding document:', error);
        alert('등록 실패!');
    }
});

// 페이지 로드 시 지도 초기화
document.addEventListener('DOMContentLoaded', initMap);

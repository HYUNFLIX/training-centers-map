// Firebase 공통 설정 import
import { FIREBASE_CONFIG, FIREBASE_SDK_VERSION, getFirebaseUrl, COLLECTIONS } from '../firebase-config.js';

// Firebase SDK 동적 import
const { initializeApp } = await import(getFirebaseUrl('app'));
const { getFirestore, collection, addDoc } = await import(getFirebaseUrl('firestore'));
const { getAuth, onAuthStateChanged } = await import(getFirebaseUrl('auth'));

// Firebase 초기화 (공통 설정 사용)
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
const auth = getAuth(app);

console.log('✅ Firebase 초기화 완료 (SDK v' + FIREBASE_SDK_VERSION + ', 공통 설정 사용)');

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
        basicInfo: document.getElementById('basicInfo').value.trim(), // 기본정보 필드 추가
        location: {
            lat: position.lat(),
            lng: position.lng()
        },
        links: {
            naver: document.getElementById('naverLink').value.trim(),
            website: document.getElementById('websiteLink').value.trim()
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };

    try {
        // 현재 인증된 사용자 확인
        const user = auth.currentUser;
        if (!user) {
            alert('로그인이 필요합니다.');
            window.location.href = '/admin/login.html';
            return;
        }

        await addDoc(collection(db, COLLECTIONS.TRAINING_CENTERS), data);
        alert('연수원이 성공적으로 추가되었습니다!');
        document.getElementById('centerForm').reset();
        marker.setMap(null);
        marker = null;
    } catch (error) {
        console.error('Error adding document:', error);
        alert('등록 실패! ' + error.message);
    }
});

// 페이지 로드 시 지도 초기화
document.addEventListener('DOMContentLoaded', initMap);

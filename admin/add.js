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
async function initMap() {
    try {
        map = new naver.maps.Map('map', {
            center: new naver.maps.LatLng(36.5, 127.5),
            zoom: 7
        });

        // 지도 클릭 이벤트
        naver.maps.Event.addListener(map, 'click', function(e) {
            updateMarkerPosition(e.coord);
        });
    } catch (error) {
        console.error('지도 초기화 실패:', error);
    }
}

// 전역 스코프에서 함수 정의
window.searchAddress = async function() {
    const address = document.getElementById('address').value;
    if (!address) {
        alert('주소를 입력해주세요.');
        return;
    }

    try {
        naver.maps.Service.geocode({
            query: address
        }, function(status, response) {
            if (status === naver.maps.Service.Status.ERROR) {
                alert('주소를 찾을 수 없습니다.');
                return;
            }
            
            if (response.v2.meta.totalCount === 0) {
                alert('검색 결과가 없습니다.');
                return;
            }
            
            const result = response.v2.addresses[0];
            const latlng = new naver.maps.LatLng(result.y, result.x);
            
            map.setCenter(latlng);
            map.setZoom(15);
            updateMarkerPosition(latlng);
        });
    } catch (error) {
        console.error('주소 검색 실패:', error);
        alert('주소 검색에 실패했습니다.');
    }
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

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

let map;
let marker;

// 지도 초기화
function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.5, 127.5),
        zoom: 7
    });

    naver.maps.Event.addListener(map, 'click', function(e) {
        updateMarker(e.coord);
    });
}

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
document.getElementById('searchButton').addEventListener('click', function() {
    const address = document.getElementById('address').value;
    const geocoder = new naver.maps.Service.Geocoder();

    geocoder.geocode({ query: address }, function(status, response) {
        if (status === naver.maps.Service.Status.OK) {
            const result = response.v2.addresses[0];
            const point = new naver.maps.LatLng(result.y, result.x);
            map.setCenter(point);
            updateMarker(point);
        } else {
            alert('주소 검색 실패!');
        }
    });
});

// 폼 제출 처리
document.getElementById('centerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!marker) {
        alert('지도에서 위치를 선택해주세요.');
        return;
    }

    const position = marker.getPosition();
    const data = {
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
        }
    };

    try {
        await addDoc(collection(db, "trainingCenters"), data);
        alert('연수원이 성공적으로 추가되었습니다!');
    } catch (error) {
        console.error('Error adding document:', error);
        alert('등록 실패!');
    }
});

// 초기화 실행
document.addEventListener('DOMContentLoaded', initMap);

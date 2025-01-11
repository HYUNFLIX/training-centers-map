import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
const auth = getAuth(app);

let map;
let marker;

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = 'login.html';
    }
});

function initMap() {
    map = new naver.maps.Map('map', {
        center: new naver.maps.LatLng(36.5, 127.5),
        zoom: 7
    });

    naver.maps.Event.addListener(map, 'click', function(e) {
        updateMarkerPosition(e.coord);
    });
}

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
        window.location.href = '../index.html';
    } catch (error) {
        console.error('등록 실패:', error);
        alert('등록에 실패했습니다.');
    }
});

document.addEventListener('DOMContentLoaded', initMap);

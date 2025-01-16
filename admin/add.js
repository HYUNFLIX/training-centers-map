// Firebase 초기화
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 네이버 지도 API 주소 검색 기능
document.getElementById('searchButton').addEventListener('click', function () {
    const address = document.getElementById('naverSearch').value;

    naver.maps.Service.geocode({ query: address }, function (status, response) {
        if (status === naver.maps.Service.Status.OK) {
            const result = response.v2.addresses[0];
            document.getElementById('latitude').value = result.y; // 위도
            document.getElementById('longitude').value = result.x; // 경도
        } else {
            alert('주소 검색에 실패했습니다.');
        }
    });
});

// 폼 데이터 수집 및 Firebase에 저장
document.getElementById('addCenterForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const basicinfo = document.getElementById('basicinfo').value;
    const branch = document.getElementById('branch').value;
    const name = document.getElementById('name').value;
    const naverLink = document.getElementById('naverLink').value;
    const website = document.getElementById('website').value;
    const lat = parseFloat(document.getElementById('latitude').value);
    const lng = parseFloat(document.getElementById('longitude').value);

    try {
        await addDoc(collection(db, 'trainingCenters'), {
            basicinfo: basicinfo,
            branch: branch,
            links: {
                naver: naverLink,
                website: website
            },
            location: {
                lat: lat,
                lng: lng,
                name: name
            }
        });
        alert('연수원이 성공적으로 추가되었습니다!');
        document.getElementById('addCenterForm').reset();
    } catch (error) {
        console.error('Error adding document: ', error);
        alert('연수원 추가에 실패했습니다.');
    }
});

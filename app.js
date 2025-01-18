// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
   apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
   authDomain: "training-centers-map.firebaseapp.com", 
   projectId: "training-centers-map",
   storageBucket: "training-centers-map.firebasestorage.app",
   messagingSenderId: "943690141587",
   appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 전역 변수
let map;
let markers = [];
let markerClustering;

// HTML Marker Icons 정의
const htmlMarker1 = {
   content: `<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ff6b6b;border-radius:50%;"></div>`,
   size: new naver.maps.Size(40, 40),
   anchor: new naver.maps.Point(20, 20)
};

const htmlMarker2 = {
   content: `<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ff8787;border-radius:50%;"></div>`,
   size: new naver.maps.Size(40, 40),
   anchor: new naver.maps.Point(20, 20)
};

const htmlMarker3 = {
   content: `<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ffa8a8;border-radius:50%;"></div>`,
   size: new naver.maps.Size(40, 40),
   anchor: new naver.maps.Point(20, 20)
};

const htmlMarker4 = {
   content: `<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ffc9c9;border-radius:50%;"></div>`,
   size: new naver.maps.Size(40, 40),
   anchor: new naver.maps.Point(20, 20)
};

const htmlMarker5 = {
   content: `<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:#ffd8d8;border-radius:50%;"></div>`,
   size: new naver.maps.Size(40, 40),
   anchor: new naver.maps.Point(20, 20)
};

// InfoWindow 객체 생성
const infowindow = new naver.maps.InfoWindow({
   content: '',
   maxWidth: 300,
   backgroundColor: "#fff",
   borderColor: "#888",
   borderWidth: 2,
   anchorSize: new naver.maps.Size(30, 30),
   anchorSkew: true,
   anchorColor: "#fff",
   pixelOffset: new naver.maps.Point(20, -20)
});

// 지도 초기화 함수
function initMap() {
   map = new naver.maps.Map('map', {
       center: new naver.maps.LatLng(36.5, 127.5),
       zoom: 7,
       minZoom: 6,
       zoomControl: true,
       zoomControlOptions: {
           position: naver.maps.Position.TOP_RIGHT,
           style: naver.maps.ZoomControlStyle.SMALL
       }
   });

   // 지도 클릭 시 InfoWindow 닫기
   naver.maps.Event.addListener(map, 'click', function() {
       infowindow.close();
   });
}

// 마커 생성 함수
function createMarker(center) {
   const position = new naver.maps.LatLng(center.location.lat, center.location.lng);
   
   const marker = new naver.maps.Marker({
       position: position,
       map: map
   });

   naver.maps.Event.addListener(marker, 'click', function(e) {
       const content = `
           <div class="info-window">
               <h3>${center.name || ''}</h3>
               ${center.branch ? `<p>${center.branch}</p>` : ''}
               ${center.basicInfo ? `<p>${center.basicInfo}</p>` : ''}
               <div>
                   ${center.links?.naver ? `<a href="${center.links.naver}" target="_blank">네이버 지도</a>` : ''}
                   ${center.links?.website ? `<a href="${center.links.website}" target="_blank">웹사이트</a>` : ''}
               </div>
           </div>
       `;

       infowindow.setContent(content);
       infowindow.open(map, marker);
   });

   return marker;
}

// 연수원 데이터 로드 및 마커 생성
async function loadCenters() {
   try {
       const querySnapshot = await getDocs(collection(db, "trainingCenters"));
       
       querySnapshot.forEach((doc) => {
           const center = doc.data();
           if (center.location?.lat && center.location?.lng) {
               const marker = createMarker(center);
               markers.push(marker);
           }
       });

       // 마커 클러스터링 설정
       markerClustering = new MarkerClustering({
           minClusterSize: 2,
           maxZoom: 12,
           map: map,
           markers: markers,
           disableClickZoom: false,
           gridSize: 120,
           icons: [htmlMarker1, htmlMarker2, htmlMarker3, htmlMarker4, htmlMarker5],
           indexGenerator: [10, 100, 200, 500, 1000],
           stylingFunction: function(clusterMarker, count) {
               const element = clusterMarker.getElement();
               if (element) {
                   const div = element.querySelector('div');
                   if (div) {
                       div.textContent = count;
                   }
               }
           }
       });

       // 검색 기능 초기화
       initSearch();
   } catch (error) {
       console.error('데이터 로드 실패:', error);
   }
}

// 검색 기능
function initSearch() {
   const searchInput = document.querySelector('.search-input');
   const centers = new Map(); // 검색을 위한 데이터 캐시

   searchInput.addEventListener('input', function(e) {
       const searchText = e.target.value.toLowerCase().trim();
       if (!searchText) return;

       getDocs(collection(db, "trainingCenters"))
           .then(querySnapshot => {
               querySnapshot.forEach(doc => {
                   const center = doc.data();
                   if (center.name.toLowerCase().includes(searchText)) {
                       const position = new naver.maps.LatLng(center.location.lat, center.location.lng);
                       map.setCenter(position);
                       map.setZoom(12);
                   }
               });
           })
           .catch(error => {
               console.error('검색 오류:', error);
           });
   });
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
   // 지도 초기화
   initMap();
   // 데이터 로드 및 마커 생성
   loadCenters();
});

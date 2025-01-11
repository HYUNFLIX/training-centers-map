import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, addDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase 설정
const firebaseConfig = {
    apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.firebasestorage.app",
    messagingSenderId: "943690141587",
    appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let currentUser = null;

// 네이버 지도 초기화
const map = new naver.maps.Map('map', {
    center: new naver.maps.LatLng(36.5, 127.5),
    zoom: 7,
    zoomControl: true,
    zoomControlOptions: {
        position: naver.maps.Position.TOP_RIGHT
    }
});

// 마커와 정보창을 저장할 객체
const markers = new Map();
const infoWindows = new Map();

// Google 로그인 함수
async function handleGoogleLogin() {
    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
        console.log("로그인 성공:", currentUser.displayName);
        return true;
    } catch (error) {
        console.error("로그인 실패:", error);
        return false;
    }
}

// 로그아웃 함수
async function handleLogout() {
    try {
        await signOut(auth);
        currentUser = null;
        console.log("로그아웃 성공");
        return true;
    } catch (error) {
        console.error("로그아웃 실패:", error);
        return false;
    }
}

// 리뷰 작성 함수
async function submitReview(centerId, rating, comment) {
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    try {
        const reviewData = {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            centerId: centerId,
            rating: rating,
            comment: comment,
            createdAt: new Date()
        };

        await addDoc(collection(db, "reviews"), reviewData);

        const centerRef = doc(db, "trainingCenters", centerId);
        const centerDoc = await getDoc(centerRef);
        const centerData = centerDoc.data();
        
        const currentRating = centerData.rating || { average: 0, count: 0 };
        const newCount = currentRating.count + 1;
        const newAverage = ((currentRating.average * currentRating.count) + rating) / newCount;
        
        await updateDoc(centerRef, {
            'rating.average': newAverage,
            'rating.count': newCount
        });

        alert("리뷰가 등록되었습니다.");
        // 정보창 업데이트
        loadCenterInfo(centerId);
        return true;
    } catch (error) {
        console.error("리뷰 등록 실패:", error);
        alert("리뷰 등록에 실패했습니다.");
        return false;
    }
}

// 리뷰 목록 컴포넌트 생성
async function createReviewsList(centerId) {
    const reviewsQuery = query(
        collection(db, "reviews"),
        where("centerId", "==", centerId),
        orderBy("createdAt", "desc")
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    let reviewsHTML = '';
    
    reviewsSnapshot.forEach(doc => {
        const review = doc.data();
        reviewsHTML += `
            <div class="review-item">
                <div class="review-author">${review.userName}</div>
                <div class="rating-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                <div class="review-text">${review.comment}</div>
            </div>
        `;
    });
    
    return reviewsHTML;
}

// 정보창 내용 업데이트
async function loadCenterInfo(centerId) {
    try {
        const centerDoc = await getDoc(doc(db, "trainingCenters", centerId));
        const center = centerDoc.data();
        const reviewsList = await createReviewsList(centerId);
        
        const contentString = `
            <div class="popup-content">
                <h3>${center.name}</h3>
                <p>${center.branch}</p>
                <p>${center.basicInfo}</p>
                <div class="links">
                    <a href="${center.links?.naver}" target="_blank">네이버 지도</a>
                    <a href="${center.links?.website}" target="_blank">웹사이트</a>
                </div>
                <div class="review-section">
                    <div class="rating-stars">
                        ${'★'.repeat(Math.round(center.rating?.average || 0))}
                        ${'☆'.repeat(5 - Math.round(center.rating?.average || 0))}
                        <span class="rating-info">
                            (${center.rating?.average?.toFixed(1) || '0.0'} / ${center.rating?.count || 0}개)
                        </span>
                    </div>
                    ${currentUser ? `
                        <button class="btn btn-primary" onclick="showReviewForm('${centerId}')">
                            리뷰 작성
                        </button>
                    ` : `
                        <button class="btn btn-secondary" onclick="handleGoogleLogin()">
                            로그인하여 리뷰 작성
                        </button>
                    `}
                    <div class="review-form" id="reviewForm-${centerId}">
                        <div class="rating-stars">
                            ${'★'.repeat(5)}
                        </div>
                        <textarea class="review-input" placeholder="리뷰를 작성해주세요"></textarea>
                        <button class="btn btn-primary" onclick="submitReview('${centerId}', 5, this.previousElementSibling.value)">
                            등록
                        </button>
                    </div>
                    <div class="reviews-list">
                        ${reviewsList}
                    </div>
                </div>
            </div>
        `;

        infoWindows.get(centerId).setContent(contentString);
    } catch (error) {
        console.error("정보창 업데이트 실패:", error);
    }
}

// 연수원 데이터 로드 및 마커 생성
async function loadCenters() {
    try {
        console.log("데이터 로드 시작");
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        
        querySnapshot.forEach((doc) => {
            const center = doc.data();
            if (!center.location?.lat || !center.location?.lng) return;

            // 마커 생성
            const markerPosition = new naver.maps.LatLng(center.location.lat, center.location.lng);
            const marker = new naver.maps.Marker({
                position: markerPosition,
                map: map,
                icon: {
                    content: `<div style="cursor:pointer;width:40px;height:40px;line-height:42px;font-size:10px;color:white;text-align:center;font-weight:bold;background:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ff3333"><path d="M12 0C7.802 0 4 3.403 4 7.602C4 11.8 12 24 12 24S20 11.8 20 7.602C20 3.403 16.199 0 12 0ZM12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z"/></svg>') no-repeat;background-size:contain;"></div>`,
                    size: new naver.maps.Size(40, 40),
                    anchor: new naver.maps.Point(20, 40)
                }
            });

            // 정보창 생성
            const infoWindow = new naver.maps.InfoWindow({
                content: '<div class="popup-content">로딩중...</div>',
                maxWidth: 400,
                backgroundColor: "white",
                borderColor: "#666",
                borderWidth: 0,
                anchorSize: new naver.maps.Size(0, 0),
                pixelOffset: new naver.maps.Point(0, -10)
            });

            // 마커와 정보창 저장
            markers.set(doc.id, marker);
            infoWindows.set(doc.id, infoWindow);

            // 클릭 이벤트
            naver.maps.Event.addListener(marker, 'click', async () => {
                // 다른 정보창들 닫기
                infoWindows.forEach(window => window.close());
                
                // 현재 정보창 열기
                infoWindow.open(map, marker);
                
                // 정보창 내용 로드
                await loadCenterInfo(doc.id);
            });
        });

        // 검색 기능 초기화
        initializeSearch();
    } catch (error) {
        console.error("데이터 로드 중 에러:", error);
    }
}

// 검색 기능 구현
function initializeSearch() {
    const searchInput = document.querySelector('.search-input');
    const searchResults = document.querySelector('.search-results');
    let centers = [];

    async function loadSearchData() {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        centers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    function showSearchResults(results) {
        searchResults.innerHTML = '';
        if (results.length > 0) {
            results.forEach(center => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.textContent = `${center.name} (${center.branch})`;
                div.onclick = () => {
                    const marker = markers.get(center.id);
                    if (marker) {
                        map.setCenter(marker.getPosition());
                        map.setZoom(15);
                        marker.trigger('click');
                    }
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                };
                searchResults.appendChild(div);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    }

    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.toLowerCase();
        if (value) {
            const results = centers.filter(center => 
                center.name.toLowerCase().includes(value) || 
                center.branch.toLowerCase().includes(value)
            );
            showSearchResults(results);
        } else {
            searchResults.style.display = 'none';
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });

    loadSearchData();
}

// 리뷰 폼 표시 함수
window.showReviewForm = function(centerId) {
    const form = document.querySelector(`#reviewForm-${centerId}`);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

// 전역 함수 등록
window.handleGoogleLogin = handleGoogleLogin;
window.handleLogout = handleLogout;
window.submitReview = submitReview;

// 인증 상태 변경 감지
auth.onAuthStateChanged((user) => {
    currentUser = user;
    // 필요한 경우 UI 업데이트
});

// 초기 데이터 로드
loadCenters().catch(console.error);

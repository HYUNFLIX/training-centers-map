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

// 마커와 정보창 저장 객체
const markers = new Map();
const infoWindows = new Map();

// Google 로그인 함수
async function handleGoogleLogin() {
    try {
        const result = await signInWithPopup(auth, provider);
        currentUser = result.user;
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
        return true;
    } catch (error) {
        console.error("로그아웃 실패:", error);
        return false;
    }
}

// 리뷰 컴포넌트 생성
async function createReviewComponent(center, docId) {
    let reviewsHTML = '';
    try {
        const reviewsQuery = query(
            collection(db, "reviews"),
            where("centerId", "==", docId),
            orderBy("createdAt", "desc")
        );
        const reviewsSnapshot = await getDocs(reviewsQuery);
        
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
    } catch (error) {
        console.error("리뷰 로드 실패:", error);
    }

    return `
        <div class="review-section">
            <div class="rating-summary">
                <div class="rating-stars">
                    ${'★'.repeat(Math.round(center.rating?.average || 0))}
                    ${'☆'.repeat(5 - Math.round(center.rating?.average || 0))}
                </div>
                <div class="review-info">
                    평점: ${center.rating?.average?.toFixed(1) || '0.0'} (${center.rating?.count || 0}개의 평가)
                </div>
            </div>
            <div class="reviews-list">
                ${reviewsHTML}
            </div>
            ${currentUser ? `
                <button class="btn btn-primary" onclick="window.showReviewForm('${docId}')">
                    리뷰 작성
                </button>
                <div id="reviewForm-${docId}" class="review-form">
                    <div class="rating-input">
                        ${Array(5).fill().map((_, i) => `
                            <span class="rating-star" data-rating="${i+1}">☆</span>
                        `).join('')}
                    </div>
                    <textarea class="review-input" placeholder="리뷰를 작성해주세요"></textarea>
                    <button class="btn btn-primary" onclick="window.submitReview('${docId}')">등록</button>
                </div>
            ` : `
                <button class="btn btn-secondary" onclick="window.handleGoogleLogin()">
                    Google 로그인하여 리뷰 작성
                </button>
            `}
        </div>
    `;
}

// 정보창 업데이트
async function updateInfoWindow(marker, center, docId) {
    const reviewComponent = await createReviewComponent(center, docId);
    
    const content = `
        <div class="popup-content">
            <h3>${center.name}</h3>
            <p>${center.branch}</p>
            <p>${center.basicInfo}</p>
            <div class="links">
                <a href="${center.links?.naver}" target="_blank">네이버 지도</a>
                <a href="${center.links?.website}" target="_blank">웹사이트</a>
            </div>
            ${reviewComponent}
        </div>
    `;

    return content;
}

// 리뷰 제출 함수
async function submitReview(centerId) {
    if (!currentUser) {
        alert("로그인이 필요합니다.");
        return;
    }

    const form = document.querySelector(`#reviewForm-${centerId}`);
    const rating = form.querySelector('.rating-input').getAttribute('data-selected');
    const comment = form.querySelector('.review-input').value;

    if (!rating) {
        alert("별점을 선택해주세요.");
        return;
    }
    if (!comment.trim()) {
        alert("리뷰 내용을 입력해주세요.");
        return;
    }

    try {
        // 리뷰 추가
        const reviewData = {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            centerId: centerId,
            rating: parseInt(rating),
            comment: comment,
            createdAt: new Date()
        };

        await addDoc(collection(db, "reviews"), reviewData);

        // 평균 평점 업데이트
        const centerRef = doc(db, "trainingCenters", centerId);
        const centerDoc = await getDoc(centerRef);
        const centerData = centerDoc.data();
        
        const currentRating = centerData.rating || { average: 0, count: 0 };
        const newCount = currentRating.count + 1;
        const newAverage = ((currentRating.average * currentRating.count) + parseInt(rating)) / newCount;
        
        await updateDoc(centerRef, {
            'rating.average': newAverage,
            'rating.count': newCount
        });

        // 정보창 업데이트
        const marker = markers.get(centerId);
        if (marker) {
            const infoWindow = infoWindows.get(centerId);
            const content = await updateInfoWindow(marker, {
                ...centerData,
                rating: { average: newAverage, count: newCount }
            }, centerId);
            infoWindow.setContent(content);
        }

        alert("리뷰가 등록되었습니다.");
    } catch (error) {
        console.error("리뷰 등록 실패:", error);
        alert("리뷰 등록에 실패했습니다.");
    }
}

// 연수원 데이터 로드 및 마커 생성
async function loadCenters() {
    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        
        querySnapshot.forEach(async (doc) => {
            const center = doc.data();
            if (!center.location?.lat || !center.location?.lng) return;

            // 마커 생성
            const markerPosition = new naver.maps.LatLng(
                center.location.lat,
                center.location.lng
            );
            
            const marker = new naver.maps.Marker({
                position: markerPosition,
                map: map,
                icon: {
                    content: '<div style="cursor:pointer;width:40px;height:40px;background:#ff3333;border-radius:20px;color:white;text-align:center;line-height:40px;font-size:20px;">▼</div>',
                    size: new naver.maps.Size(40, 40),
                    anchor: new naver.maps.Point(20, 40)
                }
            });

            // 정보창 생성
            const infoWindow = new naver.maps.InfoWindow({
                content: await updateInfoWindow(marker, center, doc.id),
                borderWidth: 0,
                disableAnchor: true,
                backgroundColor: 'transparent',
                pixelOffset: new naver.maps.Point(0, -10)
            });

            markers.set(doc.id, marker);
            infoWindows.set(doc.id, infoWindow);

            // 마커 클릭 이벤트
            naver.maps.Event.addListener(marker, 'click', function() {
                infoWindows.forEach(window => window.close());
                infoWindow.open(map, marker);
            });

            // 지도 클릭 이벤트
            naver.maps.Event.addListener(map, 'click', function() {
                infoWindow.close();
            });
        });

        initializeSearch();
    } catch (error) {
        console.error("데이터 로드 실패:", error);
    }
}

// 검색 기능
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

// 리뷰 폼 표시/숨기기
window.showReviewForm = function(centerId) {
    const form = document.querySelector(`#reviewForm-${centerId}`);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';

    // 별점 이벤트 핸들러
    const stars = form.querySelectorAll('.rating-star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = this.dataset.rating;
            form.querySelector('.rating-input').setAttribute('data-selected', rating);
            stars.forEach((s, index) => {
                s.textContent = index < rating ? '★' : '☆';
            });
        });
    });
};

// 전역 함수 등록
window.handleGoogleLogin = handleGoogleLogin;
window.handleLogout = handleLogout;
window.submitReview = submitReview;

// 인증 상태 변경 감지
auth.onAuthStateChanged((user) => {
    currentUser = user;
    loadCenters();
});

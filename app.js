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
console.log("Firebase 초기화 완료");

let currentUser = null;

// 지도 초기화
const map = L.map('map').setView([36.5, 127.5], 7);
console.log("지도 초기화 완료");

// OpenStreetMap 타일 레이어 추가
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 마커 클러스터 그룹 생성
const markerClusterGroup = L.markerClusterGroup();
map.addLayer(markerClusterGroup);

// 커스텀 마커 아이콘
const customIcon = L.divIcon({
    html: `<svg width="30" height="30" viewBox="0 0 24 24" fill="#ff3333">
             <path d="M12 0C7.802 0 4 3.403 4 7.602C4 11.8 12 24 12 24S20 11.8 20 7.602C20 3.403 16.199 0 12 0ZM12 11C10.343 11 9 9.657 9 8C9 6.343 10.343 5 12 5C13.657 5 15 6.343 15 8C15 9.657 13.657 11 12 11Z"/>
           </svg>`,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

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
        // 리뷰 추가
        const reviewData = {
            userId: currentUser.uid,
            userName: currentUser.displayName,
            centerId: centerId,
            rating: rating,
            comment: comment,
            createdAt: new Date()
        };

        await addDoc(collection(db, "reviews"), reviewData);

        // 연수원 평균 평점 업데이트
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
        return true;
    } catch (error) {
        console.error("리뷰 등록 실패:", error);
        alert("리뷰 등록에 실패했습니다.");
        return false;
    }
}

// 리뷰 컴포넌트 생성
async function createReviewComponent(center, centerId) {
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'review-section';
    
    // 평균 평점 표시
    const ratingHeader = document.createElement('div');
    ratingHeader.className = 'rating-header';
    ratingHeader.innerHTML = `
        <div class="rating-number">${center.rating?.average?.toFixed(1) || '0.0'}</div>
        <div class="rating-stars">★★★★★</div>
        <div class="review-count">${center.rating?.count || 0}개의 리뷰</div>
    `;
    reviewDiv.appendChild(ratingHeader);

    // 리뷰 목록
    const reviewsList = document.createElement('div');
    reviewsList.className = 'reviews-list';
    
    // 리뷰 데이터 가져오기
    const reviewsQuery = query(
        collection(db, "reviews"),
        where("centerId", "==", centerId),
        orderBy("createdAt", "desc")
    );
    
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.forEach(doc => {
        const review = doc.data();
        const reviewItem = document.createElement('div');
        reviewItem.className = 'review-item';
        reviewItem.innerHTML = `
            <div class="review-author">${review.userName}</div>
            <div class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
            <div class="review-text">${review.comment}</div>
        `;
        reviewsList.appendChild(reviewItem);
    });
    reviewDiv.appendChild(reviewsList);

    // 로그인 섹션 또는 리뷰 작성 폼
    const loginSection = document.createElement('div');
    loginSection.className = 'login-section';
    
    if (currentUser) {
        loginSection.innerHTML = `
            <button class="review-submit" onclick="showReviewForm('${centerId}')">리뷰 작성</button>
        `;
    } else {
        loginSection.innerHTML = `
            <button class="google-login-btn" onclick="handleGoogleLogin()">
                Google로 로그인하여 리뷰 작성
            </button>
        `;
    }
    reviewDiv.appendChild(loginSection);

    // 리뷰 작성 폼
    const reviewForm = document.createElement('div');
    reviewForm.className = 'review-form';
    reviewForm.innerHTML = `
        <div class="review-stars">
            ${Array(5).fill().map((_, i) => `
                <span class="review-star" data-rating="${i+1}">★</span>
            `).join('')}
        </div>
        <textarea class="review-input" placeholder="리뷰를 작성해주세요" rows="3"></textarea>
        <button class="review-submit">등록</button>
    `;
    reviewDiv.appendChild(reviewForm);

    return reviewDiv;
}

// 리뷰 폼 표시 함수
window.showReviewForm = function(centerId) {
    const form = document.querySelector('.review-form');
    form.style.display = 'block';
    
    // 별점 이벤트
    const stars = form.querySelectorAll('.review-star');
    let selectedRating = 0;
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            stars.forEach((s, index) => {
                s.classList.toggle('active', index < selectedRating);
            });
        });
    });

    // 제출 버튼 이벤트
    const submitBtn = form.querySelector('.review-submit');
    const textarea = form.querySelector('.review-input');
    
    submitBtn.onclick = async () => {
        if (selectedRating === 0) {
            alert("별점을 선택해주세요.");
            return;
        }
        if (!textarea.value.trim()) {
            alert("리뷰 내용을 입력해주세요.");
            return;
        }
        
        const success = await submitReview(centerId, selectedRating, textarea.value);
        if (success) {
            form.style.display = 'none';
            textarea.value = '';
            selectedRating = 0;
            stars.forEach(s => s.classList.remove('active'));
        }
    };
};

// 연수원 데이터 로드 및 마커 생성
async function loadCenters() {
    try {
        console.log("데이터 로드 시작");
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        console.log("데이터 가져옴:", querySnapshot.size, "개의 문서");
        
        querySnapshot.forEach(async (doc) => {
            const center = doc.data();
            console.log("연수원 데이터:", center);

            if (!center.location || !center.location.lat || !center.location.lng) {
                console.error("위치 정보 없음:", doc.id);
                return;
            }

            // 마커 생성
            const marker = L.marker([center.location.lat, center.location.lng], {
                icon: customIcon
            });

            // 팝업 콘텐츠 생성
            const popupContent = document.createElement('div');
            popupContent.className = 'popup-content';
            popupContent.setAttribute('data-center-id', doc.id);
            
            popupContent.innerHTML = `
                <h3>${center.name || '이름 없음'}</h3>
                <p>${center.branch || '위치 정보 없음'}</p>
                <p>${center.basicInfo || '정보 없음'}</p>
                <div class="links">
                    <a href="${center.links?.naver || '#'}" target="_blank">네이버 지도</a> | 
                    <a href="${center.links?.website || '#'}" target="_blank">웹사이트</a>
                </div>
            `;

            // 리뷰 컴포넌트 추가
            const reviewComponent = await createReviewComponent(center, doc.id);
            popupContent.appendChild(reviewComponent);

            marker.bindPopup(popupContent);
            
            // 마커를 클러스터 그룹에 추가
            markerClusterGroup.addLayer(marker);
            console.log("마커 및 팝업 생성 완료:", doc.id);
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

    // 데이터 저장
    async function loadSearchData() {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        centers = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    // 검색 결과 표시
    function showSearchResults(results) {
        searchResults.innerHTML = '';
        if (results.length > 0) {
            results.forEach(center => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                div.textContent = `${center.name} (${center.branch})`;
                div.onclick = () => {
                    map.setView([center.location.lat, center.location.lng], 13);
                    markerClusterGroup.zoomToShowLayer(
                        Array.from(markerClusterGroup.getLayers())
                            .find(layer => layer.getLatLng().lat === center.location.lat),
                        () => {
                            const marker = Array.from(markerClusterGroup.getLayers())
                                .find(layer => layer.getLatLng().lat === center.location.lat);
                            if (marker) marker.openPopup();
                        }
                    );
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

    // 검색 이벤트 처리
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

    // 검색창 외부 클릭 시 결과 숨기기
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.style.display = 'none';
        }
    });

    // 초기 데이터 로드
    loadSearchData();
}

// 전역 함수로 등록
window.handleGoogleLogin = handleGoogleLogin;
window.handleLogout = handleLogout;
window.submitReview = submitReview;

// 인증 상태 변경 감지
// 인증 상태 변경 감지
auth.onAuthStateChanged((user) => {
    currentUser = user;
    const loginSections = document.querySelectorAll('.login-section');
    loginSections.forEach(section => {
        if (user) {
            section.innerHTML = `
                <button class="review-submit">리뷰 작성</button>
            `;
        } else {
            section.innerHTML = `
                <button class="google-login-btn" onclick="handleGoogleLogin()">
                    Google로 로그인하여 리뷰 작성
                </button>
            `;
        }
    });
});

// 초기 데이터 로드
loadCenters().catch(console.error);

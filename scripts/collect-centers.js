/**
 * 연수원 데이터 수집 스크립트
 * 네이버 검색 API → Firebase Firestore 자동 저장
 *
 * 실행 방법:
 *   cd scripts
 *   npm install
 *   node collect-centers.js
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// ===== 🔑 설정 =====
const NAVER_CLIENT_ID = 'nQzRhczvTq8q3mu8MzlA';
const NAVER_CLIENT_SECRET = 'Ryo3nBB0Hv';

// Firebase 서비스 계정 키 (Firebase Console에서 다운로드)
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');

// Firebase 프로젝트 ID
const PROJECT_ID = 'training-centers-map';

// ===== Firebase 초기화 =====
admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
    projectId: PROJECT_ID,
});
const db = admin.firestore();

// ===== 지역별 검색 키워드 (시·군·구 단위 세분화) =====
const REGIONS = [
    // 서울
    { name: '서울', queries: ['서울 연수원', '서울 교육원', '서울 수련원', '강남 연수원', '종로 연수원', '마포 연수원', '영등포 연수원', '서초 연수원', '송파 연수원'] },
    // 경기도 (시 단위 세분화)
    {
        name: '경기', queries: [
            '수원 연수원', '성남 연수원', '용인 연수원', '고양 연수원', '부천 연수원',
            '안산 연수원', '안양 연수원', '남양주 연수원', '화성 연수원', '의정부 연수원',
            '파주 연수원', '시흥 연수원', '광주 연수원', '김포 연수원', '광명 연수원',
            '군포 연수원', '포천 연수원', '양평 연수원', '가평 연수원', '연천 연수원',
            '이천 연수원', '여주 연수원', '양주 연수원', '동두천 연수원', '구리 연수원',
            '오산 연수원', '하남 연수원', '의왕 연수원', '과천 연수원'
        ]
    },
    // 인천
    { name: '인천', queries: ['인천 연수원', '강화 연수원', '옹진 연수원', '서구 연수원 인천'] },
    // 강원도
    {
        name: '강원', queries: [
            '춘천 연수원', '원주 연수원', '강릉 연수원', '속초 연수원', '홍천 연수원',
            '횡성 연수원', '영월 연수원', '평창 연수원', '정선 연수원', '철원 연수원',
            '화천 연수원', '양구 연수원', '인제 연수원', '고성 연수원 강원', '삼척 연수원',
            '동해 연수원', '태백 연수원', '양양 연수원'
        ]
    },
    // 충청북도
    {
        name: '충북', queries: [
            '청주 연수원', '충주 연수원', '제천 연수원', '괴산 연수원', '증평 연수원',
            '보은 연수원', '옥천 연수원', '영동 연수원', '진천 연수원', '음성 연수원', '단양 연수원'
        ]
    },
    // 충청남도
    {
        name: '충남', queries: [
            '천안 연수원', '공주 연수원', '보령 연수원', '아산 연수원', '서산 연수원',
            '논산 연수원', '계룡 연수원', '당진 연수원', '홍성 연수원', '예산 연수원',
            '태안 연수원', '부여 연수원', '청양 연수원', '서천 연수원', '금산 연수원'
        ]
    },
    // 대전
    { name: '대전', queries: ['대전 연수원', '대전 교육원', '유성 연수원'] },
    // 세종
    { name: '세종', queries: ['세종 연수원', '세종시 연수원'] },
    // 전라북도
    {
        name: '전북', queries: [
            '전주 연수원', '익산 연수원', '군산 연수원', '완주 연수원', '정읍 연수원',
            '남원 연수원', '김제 연수원', '고창 연수원', '부안 연수원', '임실 연수원',
            '순창 연수원', '무주 연수원', '장수 연수원', '진안 연수원'
        ]
    },
    // 전라남도
    {
        name: '전남', queries: [
            '목포 연수원', '여수 연수원', '순천 연수원', '나주 연수원', '광양 연수원',
            '담양 연수원', '곡성 연수원', '구례 연수원', '고흥 연수원', '보성 연수원',
            '화순 연수원', '장흥 연수원', '강진 연수원', '해남 연수원', '영암 연수원',
            '무안 연수원', '함평 연수원', '영광 연수원', '장성 연수원', '완도 연수원',
            '진도 연수원', '신안 연수원'
        ]
    },
    // 광주
    { name: '광주', queries: ['광주 연수원', '광주 교육원', '광주광역시 연수원'] },
    // 경상북도
    {
        name: '경북', queries: [
            '포항 연수원', '경주 연수원', '김천 연수원', '안동 연수원', '구미 연수원',
            '영주 연수원', '영천 연수원', '상주 연수원', '문경 연수원', '경산 연수원',
            '군위 연수원', '의성 연수원', '청송 연수원', '영양 연수원', '영덕 연수원',
            '청도 연수원', '고령 연수원', '성주 연수원', '칠곡 연수원', '예천 연수원',
            '봉화 연수원', '울진 연수원', '울릉 연수원'
        ]
    },
    // 경상남도
    {
        name: '경남', queries: [
            '창원 연수원', '진주 연수원', '통영 연수원', '사천 연수원', '김해 연수원',
            '밀양 연수원', '거제 연수원', '양산 연수원', '의령 연수원', '함안 연수원',
            '창녕 연수원', '고성 연수원 경남', '남해 연수원', '하동 연수원', '산청 연수원',
            '함양 연수원', '거창 연수원', '합천 연수원'
        ]
    },
    // 부산
    { name: '부산', queries: ['부산 연수원', '부산 교육원', '해운대 연수원', '기장 연수원', '강서 연수원 부산'] },
    // 대구
    { name: '대구', queries: ['대구 연수원', '대구 교육원', '달성 연수원'] },
    // 울산
    { name: '울산', queries: ['울산 연수원', '울주 연수원'] },
    // 제주
    { name: '제주', queries: ['제주 연수원', '제주도 연수원', '서귀포 연수원', '제주 교육원', '제주 수련원'] },
];

// ===== 유틸 함수 =====

/** HTML 태그 제거 (<b>태그 등) */
const stripHtml = (str) => str.replace(/<[^>]*>/g, '').trim();

/** 주소에서 지역 추출 */
const extractRegion = (address) => {
    const regionMap = {
        '서울': '서울', '경기': '경기', '인천': '인천',
        '부산': '부산', '대구': '대구', '대전': '대전',
        '광주': '광주', '울산': '울산', '세종': '세종',
        '강원': '강원', '충북': '충북', '충남': '충남',
        '전북': '전북', '전남': '전남', '경북': '경북',
        '경남': '경남', '제주': '제주',
    };
    for (const [key, value] of Object.entries(regionMap)) {
        if (address.includes(key)) return value;
    }
    return '기타';
};

/** 네이버 좌표(1/10,000,000도) → WGS84 */
const naverCoordToWGS84 = (mapx, mapy) => ({
    lat: parseInt(mapy) / 10000000,
    lng: parseInt(mapx) / 10000000,
});

/** 중복 키 생성 (이름 + 주소 앞 20자) */
const dedupeKey = (name, address) =>
    `${name}_${address.substring(0, 20)}`.replace(/\s/g, '');

/** 딜레이 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ===== 네이버 지역 검색 API 호출 =====
async function searchNaver(query, start = 1) {
    const url = new URL('https://openapi.naver.com/v1/search/local.json');
    url.searchParams.set('query', query);
    url.searchParams.set('display', '100');
    url.searchParams.set('start', start);

    const res = await fetch(url.toString(), {
        headers: {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
    });

    if (!res.ok) {
        console.error(`  ❌ API 오류 [${res.status}]: ${query}`);
        return [];
    }

    const data = await res.json();
    return data.items || [];
}

// ===== 기존 Firestore 데이터 로드 =====
async function loadExistingCenters() {
    const snap = await db.collection('trainingCenters').get();
    const existing = new Set();
    snap.forEach((doc) => {
        const d = doc.data();
        existing.add(dedupeKey(d.name || '', d.address || d.roadAddress || ''));
    });
    console.log(`📦 기존 데이터: ${existing.size}개`);
    return existing;
}

// ===== Firestore 저장 =====
async function saveCenters(centers) {
    const col = db.collection('trainingCenters');
    let saved = 0;
    for (const c of centers) {
        await col.add(c);
        saved++;
        process.stdout.write(`\r  💾 저장 중... ${saved}/${centers.length}`);
    }
    console.log(`\n  ✅ ${saved}개 저장 완료`);
    return saved;
}

// ===== 메인 =====
async function main() {
    console.log('🚀 연수원 데이터 수집 시작\n');

    const existing = await loadExistingCenters();
    const newCenters = [];
    const seen = new Set(existing);

    for (const region of REGIONS) {
        console.log(`\n📍 [${region.name}] 검색 중...`);

        for (const query of region.queries) {
            const items = await searchNaver(query);
            console.log(`  "${query}" → ${items.length}건`);

            for (const item of items) {
                const name = stripHtml(item.title);
                const address = item.roadAddress || item.address || '';
                const key = dedupeKey(name, address);

                // 중복 제거
                if (seen.has(key)) continue;
                // 연수원/수련원/교육원 관련 아닌 항목 필터링
                const cat = item.category || '';
                const validCat = cat.includes('연수') || cat.includes('수련') ||
                    cat.includes('교육') || cat.includes('숙박');
                if (!validCat) continue;

                seen.add(key);

                const location = naverCoordToWGS84(item.mapx, item.mapy);
                const regionName = extractRegion(address);

                newCenters.push({
                    name,
                    branch: '',
                    address,
                    region: regionName,
                    phone: item.telephone || '',
                    capacity: null,
                    basicInfo: item.description ? stripHtml(item.description) : '',
                    links: {
                        naver: item.link || '',
                        website: '',
                    },
                    location,
                    source: 'naver-api',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            await sleep(150); // API rate limit 방지
        }
    }

    console.log(`\n📊 수집 결과:`);
    console.log(`  - 신규 연수원: ${newCenters.length}개`);
    console.log(`  - 기존 중복 제외됨\n`);

    if (newCenters.length === 0) {
        console.log('✅ 추가할 새 연수원이 없습니다.');
        process.exit(0);
    }

    console.log('💾 Firestore에 저장 중...');
    const saved = await saveCenters(newCenters);

    console.log(`\n🎉 완료! 총 ${saved}개의 연수원이 추가되었습니다.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ 오류 발생:', err);
    process.exit(1);
});

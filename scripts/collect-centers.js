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

// ===== 지역별 검색 키워드 =====
const REGIONS = [
    { name: '서울', queries: ['서울 연수원', '서울 교육원', '서울 수련원'] },
    { name: '경기', queries: ['경기 연수원', '수도권 연수원'] },
    { name: '인천', queries: ['인천 연수원'] },
    { name: '강원', queries: ['강원 연수원', '강원도 수련원'] },
    { name: '충북', queries: ['충북 연수원', '충청북도 연수원'] },
    { name: '충남', queries: ['충남 연수원', '충청남도 연수원'] },
    { name: '전북', queries: ['전북 연수원', '전라북도 연수원'] },
    { name: '전남', queries: ['전남 연수원', '전라남도 연수원'] },
    { name: '경북', queries: ['경북 연수원', '경상북도 연수원'] },
    { name: '경남', queries: ['경남 연수원', '경상남도 연수원'] },
    { name: '부산', queries: ['부산 연수원'] },
    { name: '대구', queries: ['대구 연수원'] },
    { name: '대전', queries: ['대전 연수원'] },
    { name: '광주', queries: ['광주 연수원'] },
    { name: '울산', queries: ['울산 연수원'] },
    { name: '세종', queries: ['세종 연수원'] },
    { name: '제주', queries: ['제주 연수원', '제주도 연수원'] },
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

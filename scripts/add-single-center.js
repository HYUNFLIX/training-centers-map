/**
 * 단일 연수원 등록 스크립트
 * 네이버 지역 검색 API로 정보 조회 후 Firestore에 저장
 * 실행: cd scripts && node add-single-center.js
 */

import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const NAVER_CLIENT_ID = 'nQzRhczvTq8q3mu8MzlA';
const NAVER_CLIENT_SECRET = 'Ryo3nBB0Hv';
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
    projectId: 'training-centers-map',
});
const db = admin.firestore();

/** 네이버 좌표(1/10,000,000도) → WGS84 */
const toWGS84 = (mapx, mapy) => ({
    lat: parseInt(mapy) / 10000000,
    lng: parseInt(mapx) / 10000000,
});

/** HTML 태그 제거 */
const stripTags = (str) => str.replace(/<[^>]+>/g, '').trim();

async function searchNaver(query) {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`;
    const res = await fetch(url, {
        headers: {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
    });
    if (!res.ok) throw new Error(`API 오류 [${res.status}]`);
    const data = await res.json();
    return data.items || [];
}

async function run() {
    // 네이버 API로 'KB증권 연수원' 검색
    const query = 'KB증권 연수원 용인';
    console.log(`🔍 네이버 검색: "${query}"`);
    const items = await searchNaver(query);

    if (items.length === 0) {
        console.log('❌ 검색 결과 없음');
        process.exit(1);
    }

    // 첫 번째 결과 출력
    items.forEach((item, i) => {
        console.log(`\n[${i + 1}] ${stripTags(item.title)}`);
        console.log(`    주소: ${item.roadAddress || item.address}`);
        console.log(`    전화: ${item.telephone}`);
        console.log(`    좌표: lat=${parseInt(item.mapy) / 10000000}, lng=${parseInt(item.mapx) / 10000000}`);
        console.log(`    카테고리: ${item.category}`);
    });

    // 가장 적합한 항목 선택 (첫 번째)
    const best = items[0];
    const { lat, lng } = toWGS84(best.mapx, best.mapy);
    const name = stripTags(best.title);
    const address = best.roadAddress || best.address;

    // 중복 확인
    const existing = await db.collection('trainingCenters')
        .where('name', '==', name)
        .get();

    if (!existing.empty) {
        console.log(`\n⚠️  이미 등록된 연수원입니다: ${name}`);
        process.exit(0);
    }

    // Firestore 저장
    const centerData = {
        name,
        branch: '',
        region: '경기',
        address,
        phone: best.telephone || '031-288-7000',
        email: 'campus@kbsec.com',
        lat,
        lng,
        capacity: 0,
        basicInfo: `${name}. ${address}. ${best.category || ''}`,
        links: {
            naver: `https://map.naver.com/v5/search/${encodeURIComponent(name)}`,
            website: 'https://www.kbsec.com',
        },
        clickCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('trainingCenters').add(centerData);
    console.log(`\n✅ 등록 완료!`);
    console.log(`   이름: ${name}`);
    console.log(`   주소: ${address}`);
    console.log(`   좌표: lat=${lat}, lng=${lng}`);
    console.log(`   Document ID: ${docRef.id}`);

    process.exit(0);
}

run().catch((err) => {
    console.error('❌ 오류:', err.message);
    process.exit(1);
});

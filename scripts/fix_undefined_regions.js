/**
 * region이 undefined / 빈값인 연수원을 네이버 검색 API로 다시 조회하여
 * 주소 및 지역 필드를 업데이트하는 스크립트
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');

// ===== 네이버 API 키 =====
const NAVER_CLIENT_ID = 'nQzRhczvTq8q3mu8MzlA';
const NAVER_CLIENT_SECRET = 'Ryo3nBB0Hv';

admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
    projectId: 'training-centers-map',
});
const db = admin.firestore();

/** HTML 태그 제거 */
const stripHtml = (str) => (str || '').replace(/<[^>]*>/g, '').trim();

/** 주소에서 지역 추출 (전체 도명 포함) */
function extractRegion(addr) {
    if (!addr) return null;
    const map = [
        ['서울특별시', '서울'], ['서울', '서울'],
        ['경기도', '경기'], ['경기', '경기'],
        ['인천광역시', '인천'], ['인천', '인천'],
        ['강원특별자치도', '강원'], ['강원도', '강원'], ['강원', '강원'],
        ['충청북도', '충북'], ['충북', '충북'],
        ['충청남도', '충남'], ['충남', '충남'],
        ['전라북도', '전북'], ['전북특별자치도', '전북'], ['전북', '전북'],
        ['전라남도', '전남'], ['전남', '전남'],
        ['경상북도', '경북'], ['경북', '경북'],
        ['경상남도', '경남'], ['경남', '경남'],
        ['부산광역시', '부산'], ['부산', '부산'],
        ['대구광역시', '대구'], ['대구', '대구'],
        ['대전광역시', '대전'], ['대전', '대전'],
        ['광주광역시', '광주'], ['광주', '광주'],
        ['울산광역시', '울산'], ['울산', '울산'],
        ['세종특별자치시', '세종'], ['세종', '세종'],
        ['제주특별자치도', '제주'], ['제주도', '제주'], ['제주', '제주'],
    ];
    for (const [keyword, region] of map) {
        if (addr.includes(keyword)) return region;
    }
    return null;
}

/** 네이버 지역 검색 */
async function searchNaver(query) {
    const url = new URL('https://openapi.naver.com/v1/search/local.json');
    url.searchParams.set('query', query);
    url.searchParams.set('display', '5');

    const res = await fetch(url.toString(), {
        headers: {
            'X-Naver-Client-Id': NAVER_CLIENT_ID,
            'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
        },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0] || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    console.log('🔍 region undefined 항목 네이버 재검색 시작\n');

    const snap = await db.collection('trainingCenters').get();
    const targets = [];
    snap.forEach(doc => {
        const d = doc.data();
        if (!d.region || d.region === 'undefined' || d.region === '') {
            targets.push({ id: doc.id, ...d });
        }
    });

    console.log(`대상: ${targets.length}개\n`);

    let updated = 0;
    let notFound = 0;

    for (const center of targets) {
        const item = await searchNaver(center.name + ' 연수원');
        await sleep(200);

        if (!item) {
            // 이름만으로 재시도
            const item2 = await searchNaver(center.name);
            await sleep(200);
            if (!item2) {
                console.log(`  ❌ 검색 실패: ${center.name}`);
                notFound++;
                continue;
            }

            const addr = item2.roadAddress || item2.address || '';
            const region = extractRegion(addr);
            if (!region) {
                console.log(`  ⚠️  지역 추출 불가: ${center.name} | 주소: ${addr}`);
                notFound++;
                continue;
            }

            await db.collection('trainingCenters').doc(center.id).update({
                address: addr,
                region,
            });
            console.log(`  ✅ ${center.name} → ${region} (${addr})`);
            updated++;
            continue;
        }

        const addr = item.roadAddress || item.address || '';
        const region = extractRegion(addr);
        if (!region) {
            console.log(`  ⚠️  지역 추출 불가: ${center.name} | 주소: ${addr}`);
            notFound++;
            continue;
        }

        await db.collection('trainingCenters').doc(center.id).update({
            address: addr,
            region,
            phone: item.telephone || center.phone || '',
        });
        console.log(`  ✅ ${center.name} → ${region} (${addr})`);
        updated++;
    }

    console.log(`\n완료!`);
    console.log(`  ✅ 업데이트: ${updated}개`);
    console.log(`  ❌ 실패/미확인: ${notFound}개`);
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

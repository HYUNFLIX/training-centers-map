/**
 * 전화번호가 없는 연수원을 네이버에서 다시 검색하여 contact 업데이트
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');

const NAVER_CLIENT_ID = 'nQzRhczvTq8q3mu8MzlA';
const NAVER_CLIENT_SECRET = 'Ryo3nBB0Hv';

admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT), projectId: 'training-centers-map' });
const db = admin.firestore();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const stripHtml = (str) => (str || '').replace(/<[^>]*>/g, '').trim();

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
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
}

async function main() {
    console.log('📞 연락처 업데이트 시작\n');
    const snap = await db.collection('trainingCenters').get();

    // 연락처 없는 항목만 추출
    const targets = [];
    snap.forEach(doc => {
        const d = doc.data();
        if (!d.contact?.trim() && !d.phone?.trim()) {
            targets.push({ id: doc.id, name: d.name });
        }
    });
    console.log(`대상: ${targets.length}개\n`);

    let updated = 0;
    let notFound = 0;

    for (let i = 0; i < targets.length; i++) {
        const { id, name } = targets[i];

        // 검색
        const items = await searchNaver(name);
        await sleep(150);

        // 이름이 정확히 일치하는 항목에서 전화번호 찾기
        let phone = '';
        for (const item of items) {
            const itemName = stripHtml(item.title);
            if (itemName === name || itemName.includes(name) || name.includes(itemName)) {
                phone = item.telephone?.trim() || '';
                if (phone) break;
            }
        }

        // 못 찾으면 첫 번째 결과에서라도
        if (!phone && items.length > 0) {
            phone = items[0].telephone?.trim() || '';
        }

        if (phone) {
            await db.collection('trainingCenters').doc(id).update({ contact: phone });
            updated++;
        } else {
            notFound++;
        }

        // 진행상황 표시
        process.stdout.write(`\r  ${i + 1}/${targets.length} | 업데이트: ${updated}개 | 전화번호 없음: ${notFound}개`);
    }

    console.log(`\n\n완료!`);
    console.log(`  ✅ 연락처 업데이트: ${updated}개`);
    console.log(`  ❌ 전화번호 없음(네이버 미등록): ${notFound}개`);
    process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });

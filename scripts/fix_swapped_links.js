/**
 * naver와 website 링크가 뒤바뀐 항목 수정
 * 조건: naver 값이 naver.me / map.naver.com 이 아니고, 
 *       website 값이 naver.me / map.naver.com 인 경우 → 스왑
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT), projectId: 'training-centers-map' });
const db = admin.firestore();

function isNaverUrl(url) {
    return url && (
        url.includes('naver.me') ||
        url.includes('map.naver.com') ||
        url.includes('naver.com/local') ||
        url.includes('naver.com/entry')
    );
}

async function main() {
    console.log('🔄 링크 스왑 작업 시작\n');
    const snap = await db.collection('trainingCenters').get();

    let swapped = 0;
    for (const doc of snap.docs) {
        const d = doc.data();
        const n = d.links?.naver?.trim() || '';
        const w = d.links?.website?.trim() || '';

        // website에 네이버 URL이 있고, naver에 일반 URL이 있으면 → 뒤바뀐 것
        const needsSwap = isNaverUrl(w) && !isNaverUrl(n) && n;
        if (needsSwap) {
            await db.collection('trainingCenters').doc(doc.id).update({
                'links.naver': w,
                'links.website': n,
            });
            console.log(`  ✅ ${d.name}`);
            console.log(`     naver:   ${w}`);
            console.log(`     website: ${n}`);
            swapped++;
        }
    }

    console.log(`\n완료! 총 ${swapped}개 스왑됨`);
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

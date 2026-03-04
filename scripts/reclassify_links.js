/**
 * links.naver에 저장된 URL이 실제 네이버 URL인지 검사하여
 * 아니라면 links.website으로 이동하는 마이그레이션
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT), projectId: 'training-centers-map' });
const db = admin.firestore();

function isNaverUrl(url) {
    if (!url) return false;
    return (
        url.includes('naver.me') ||
        url.includes('map.naver.com') ||
        url.includes('naver.com/local') ||
        url.includes('naver.com/entry') ||
        url.includes('place.naver.com')
    );
}

async function main() {
    console.log('🔍 links.naver 필드 URL 재분류 시작\n');
    const snap = await db.collection('trainingCenters').get();

    let moved = 0;   // naver → website으로 이동
    let kept = 0;    // 올바른 네이버 URL 유지
    let already = 0; // 이미 website에 값이 있어서 스킵

    for (const doc of snap.docs) {
        const d = doc.data();
        const naverVal = d.links?.naver?.trim() || '';
        const websiteVal = d.links?.website?.trim() || '';

        if (!naverVal) continue;

        // links.naver에 있는 URL이 네이버 URL이 아닌 경우
        if (!isNaverUrl(naverVal)) {
            if (websiteVal) {
                // website에 이미 값이 있으면 그냥 naver만 지우기
                await db.collection('trainingCenters').doc(doc.id).update({
                    'links.naver': '',
                    'links.website': websiteVal  // 기존 website 유지
                });
                already++;
            } else {
                // website이 비어있으면 naver→website으로 이동, naver는 비우기
                await db.collection('trainingCenters').doc(doc.id).update({
                    'links.naver': '',
                    'links.website': naverVal
                });
                console.log(`  📤 이동: ${d.name} | ${naverVal}`);
                moved++;
            }
        } else {
            kept++;
        }
    }

    console.log(`\n완료!`);
    console.log(`  📤 website으로 이동: ${moved}개`);
    console.log(`  ✅ 올바른 네이버 URL 유지: ${kept}개`);
    console.log(`  ⏭️  스킵(website 이미 존재): ${already}개`);
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

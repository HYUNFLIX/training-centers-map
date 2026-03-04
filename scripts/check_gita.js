/**
 * '기타' 지역으로 저장된 연수원 확인 스크립트
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
    projectId: 'training-centers-map',
});
const db = admin.firestore();

async function main() {
    const snap = await db.collection('trainingCenters').where('region', '==', '기타').get();
    console.log(`총 '기타' 항목: ${snap.size}개\n`);

    // 주소 패턴 분석
    const addrPatterns = {};
    snap.forEach(doc => {
        const d = doc.data();
        const addr = d.address || d.roadAddress || '(주소없음)';
        // 첫 3글자로 패턴 분류
        const key = addr.substring(0, 5);
        addrPatterns[key] = (addrPatterns[key] || 0) + 1;
    });

    console.log('== 주소 패턴 빈도 (상위 30) ==');
    Object.entries(addrPatterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .forEach(([k, v]) => console.log(`  "${k}..." : ${v}개`));

    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

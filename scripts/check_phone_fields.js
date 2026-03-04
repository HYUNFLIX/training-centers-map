import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT), projectId: 'training-centers-map' });
const db = admin.firestore();

async function main() {
    // 최근 10개 문서의 실제 필드 구조 보기
    const snap = await db.collection('trainingCenters').limit(10).get();
    console.log('=== 샘플 10개 문서 필드 ===');
    snap.forEach(doc => {
        const d = doc.data();
        console.log(`\n[${d.name}]`);
        console.log('  phone:', JSON.stringify(d.phone));
        console.log('  contact:', JSON.stringify(d.contact));
        console.log('  source:', d.source);
    });

    // 전화번호가 있는 항목 수 확인 (빈 문자열 제외)
    const all = await db.collection('trainingCenters').get();
    let withPhone = 0, withContact = 0;
    all.forEach(doc => {
        const d = doc.data();
        if (d.phone && d.phone.trim()) withPhone++;
        if (d.contact && d.contact.trim()) withContact++;
    });
    console.log(`\n총 ${all.size}개 중:`);
    console.log(`  전화번호(phone) 있음: ${withPhone}개`);
    console.log(`  연락처(contact) 있음: ${withContact}개`);
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

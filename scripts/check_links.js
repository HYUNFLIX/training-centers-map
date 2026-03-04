import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT), projectId: 'training-centers-map' });
const db = admin.firestore();

async function main() {
    const snap = await db.collection('trainingCenters').get();
    let hasNaver = 0, hasWebsite = 0, hasBoth = 0, hasNeither = 0;
    const sample = [];

    snap.forEach(doc => {
        const d = doc.data();
        const n = d.links?.naver?.trim();
        const w = d.links?.website?.trim();
        if (n && w) { hasBoth++; if (sample.length < 5) sample.push({ name: d.name, naver: n, website: w }); }
        else if (n) hasNaver++;
        else if (w) hasWebsite++;
        else hasNeither++;
    });

    console.log(`\n=== links 필드 현황 (총 ${snap.size}개) ===`);
    console.log(`  naver + website 둘 다: ${hasBoth}개`);
    console.log(`  naver만: ${hasNaver}개`);
    console.log(`  website만: ${hasWebsite}개`);
    console.log(`  둘 다 없음: ${hasNeither}개`);

    if (sample.length > 0) {
        console.log(`\n=== 양쪽 링크 있는 샘플 5개 ===`);
        sample.forEach(s => {
            console.log(`\n[${s.name}]`);
            console.log(`  naver:   ${s.naver}`);
            console.log(`  website: ${s.website}`);
        });
    }
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

/**
 * phone 필드를 contact 필드로 일괄 복사 (phone이 있고 contact가 비어있는 항목)
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
    const snap = await db.collection('trainingCenters').get();

    let updated = 0;
    let skipped = 0;

    for (const docSnap of snap.docs) {
        const d = docSnap.data();
        // phone이 있고 contact가 비어있는 경우만 복사
        if (d.phone && !d.contact) {
            await db.collection('trainingCenters').doc(docSnap.id).update({
                contact: d.phone
            });
            updated++;
        } else {
            skipped++;
        }
        if ((updated + skipped) % 50 === 0) {
            process.stdout.write(`\r  처리 중... ${updated + skipped}/${snap.size}`);
        }
    }

    console.log(`\n\n완료!`);
    console.log(`  ✅ phone → contact 복사: ${updated}개`);
    console.log(`  ⏭️  스킵(이미 contact 있음 또는 phone 없음): ${skipped}개`);
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

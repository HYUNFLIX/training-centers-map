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

    const undefinedRegion = [];
    snap.forEach(doc => {
        const d = doc.data();
        if (!d.region || d.region === 'undefined' || d.region === '') {
            undefinedRegion.push({ id: doc.id, name: d.name, address: d.address || d.roadAddress || '', region: d.region });
        }
    });

    console.log(`지역 없음 항목: ${undefinedRegion.length}개\n`);
    undefinedRegion.slice(0, 30).forEach(c => {
        console.log(`  [${c.id}] ${c.name} | region: "${c.region}" | 주소: ${c.address}`);
    });

    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

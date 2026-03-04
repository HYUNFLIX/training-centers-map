// Firestore users 컬렉션 현황만 조회 (Auth Admin 필요없음)
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT), projectId: 'training-centers-map' });
const db = admin.firestore();

async function main() {
    const snap = await db.collection('users').get();
    console.log(`\n=== Firestore users 컬렉션 (총 ${snap.size}개) ===`);
    snap.forEach(doc => {
        const d = doc.data();
        console.log(`  UID: ${doc.id} | email: ${d.email} | isAdmin: ${d.isAdmin}`);
    });
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

/**
 * Firebase Auth의 모든 사용자 목록과 Firestore users 컬렉션 현황 조회
 * isAdmin 문서가 없는 사용자를 찾아 추가합니다
 */
import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SERVICE_ACCOUNT = require('./serviceAccountKey.json');

admin.initializeApp({ credential: admin.credential.cert(SERVICE_ACCOUNT), projectId: 'training-centers-map' });
const db = admin.firestore();
const auth = admin.auth();

async function main() {
    // Firebase Auth 사용자 목록
    const listUsersResult = await auth.listUsers();
    console.log(`\n=== Firebase Auth 사용자 (총 ${listUsersResult.users.length}명) ===`);

    for (const user of listUsersResult.users) {
        // Firestore users/{uid} 문서 확인
        const userDoc = await db.collection('users').doc(user.uid).get();
        const isAdmin = userDoc.exists ? userDoc.data()?.isAdmin : false;

        console.log(`\n[${user.email}]`);
        console.log(`  UID: ${user.uid}`);
        console.log(`  Firestore users 문서: ${userDoc.exists ? '있음' : '없음'}`);
        console.log(`  isAdmin: ${isAdmin ?? false}`);

        // isAdmin이 없는 사용자에게 자동으로 추가
        if (!userDoc.exists || !isAdmin) {
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                isAdmin: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`  ✅ isAdmin: true 로 설정 완료`);
        } else {
            console.log(`  ✅ 이미 관리자 권한 있음`);
        }
    }

    console.log('\n모든 작업 완료!');
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

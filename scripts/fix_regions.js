/**
 * '기타' 지역 데이터 일괄 수정 스크립트
 * "경상북도" → "경북", "충청남도" → "충남" 등 전체 도명을 약칭으로 정상화
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

// 전체 도명 → 약칭 매핑 (충분히 포괄적으로)
function extractRegionFromAddress(addr) {
    if (!addr) return null;
    const map = [
        ['서울특별시', '서울'], ['서울', '서울'],
        ['경기도', '경기'], ['경기', '경기'],
        ['인천광역시', '인천'], ['인천', '인천'],
        ['강원특별자치도', '강원'], ['강원도', '강원'], ['강원', '강원'],
        ['충청북도', '충북'], ['충북', '충북'],
        ['충청남도', '충남'], ['충남', '충남'],
        ['전라북도', '전북'], ['전북특별자치도', '전북'], ['전북', '전북'],
        ['전라남도', '전남'], ['전남', '전남'],
        ['경상북도', '경북'], ['경북', '경북'],
        ['경상남도', '경남'], ['경남', '경남'],
        ['부산광역시', '부산'], ['부산', '부산'],
        ['대구광역시', '대구'], ['대구', '대구'],
        ['대전광역시', '대전'], ['대전', '대전'],
        ['광주광역시', '광주'], ['광주', '광주'],
        ['울산광역시', '울산'], ['울산', '울산'],
        ['세종특별자치시', '세종'], ['세종', '세종'],
        ['제주특별자치도', '제주'], ['제주', '제주'],
    ];
    for (const [keyword, region] of map) {
        if (addr.includes(keyword)) return region;
    }
    return null;
}

async function main() {
    console.log('🔄 기타 지역 데이터 수정 시작...');

    const snap = await db.collection('trainingCenters').where('region', '==', '기타').get();
    console.log(`총 '기타' 항목: ${snap.size}개\n`);

    let fixed = 0;
    let stillUnknown = 0;

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const addr = data.address || data.roadAddress || '';
        const newRegion = extractRegionFromAddress(addr);

        if (newRegion) {
            await db.collection('trainingCenters').doc(docSnap.id).update({ region: newRegion });
            fixed++;
            process.stdout.write(`\r  ✅ 수정 중: ${fixed}/${snap.size}`);
        } else {
            stillUnknown++;
        }
    }

    console.log(`\n\n완료!`);
    console.log(`  ✅ 수정됨: ${fixed}개`);
    console.log(`  ❓ 여전히 '기타': ${stillUnknown}개`);
    process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });

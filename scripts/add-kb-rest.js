/**
 * KB증권 연수원 Firestore REST API 등록 스크립트
 * Firebase Admin SDK 대신 REST API로 직접 Firestore에 등록
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');

// Google Auth를 위한 JWT 생성
import { createSign } from 'crypto';

function createJWT(serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/datastore'
    })).toString('base64url');

    const signingInput = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(signingInput);
    const signature = sign.sign(serviceAccount.private_key, 'base64url');

    return `${signingInput}.${signature}`;
}

async function getAccessToken(serviceAccount) {
    const jwt = createJWT(serviceAccount);
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(`Token 오류: ${JSON.stringify(data)}`);
    return data.access_token;
}

async function addToFirestore(token, centerData) {
    const projectId = 'training-centers-map';
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/trainingCenters`;

    // Firestore REST 형식으로 변환
    const fields = {};
    for (const [key, val] of Object.entries(centerData)) {
        if (val === null || val === undefined) continue;
        if (typeof val === 'string') fields[key] = { stringValue: val };
        else if (typeof val === 'number') fields[key] = { doubleValue: val };
        else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
        else if (typeof val === 'object') {
            // 중첩 객체 (links 등)
            const nestedFields = {};
            for (const [k, v] of Object.entries(val)) {
                nestedFields[k] = { stringValue: String(v || '') };
            }
            fields[key] = { mapValue: { fields: nestedFields } };
        }
    }
    // 서버 타임스탬프
    fields.createdAt = { timestampValue: new Date().toISOString() };
    fields.updatedAt = { timestampValue: new Date().toISOString() };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(`Firestore 오류: ${JSON.stringify(result)}`);
    return result.name; // 문서 경로 반환
}

async function run() {
    console.log('🔑 Google 인증 토큰 발급 중...');
    const token = await getAccessToken(serviceAccount);
    console.log('✅ 토큰 발급 성공');

    const centerData = {
        name: 'KB증권 연수원',
        branch: '',
        region: '경기',
        address: '경기도 용인시 기흥구 마북로240번길 17',
        phone: '031-288-7000',
        email: 'campus@kbsec.com',
        lat: 37.3099082,
        lng: 127.1348,
        capacity: 0,
        basicInfo: 'KB증권 임직원 교육 연수 시설. 경기도 용인시 기흥구 법화산 자락에 위치. 문의: campus@kbsec.com',
        links: {
            naver: 'https://map.naver.com/v5/search/KB%EC%A6%9D%EA%B6%8C%20%EC%97%B0%EC%88%98%EC%9B%90',
            website: 'https://www.kbsec.com'
        },
        clickCount: 0
    };

    console.log('\n📝 Firestore 등록 중...');
    const docPath = await addToFirestore(token, centerData);
    const docId = docPath.split('/').pop();

    console.log('✅ 등록 완료!');
    console.log(`   이름: ${centerData.name}`);
    console.log(`   주소: ${centerData.address}`);
    console.log(`   좌표: lat=${centerData.lat}, lng=${centerData.lng}`);
    console.log(`   Document ID: ${docId}`);

    process.exit(0);
}

run().catch(err => {
    console.error('❌ 오류:', err.message);
    process.exit(1);
});

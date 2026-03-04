/**
 * KB증권 연수원 location 필드 업데이트 스크립트
 * 기존에 lat/lng 최상위 필드로 저장된 데이터를 location 객체 구조로 업데이트
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const serviceAccount = require('./serviceAccountKey.json');
import { createSign } from 'crypto';

function createJWT(sa) {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
        iss: sa.client_email, sub: sa.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now, exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/datastore'
    })).toString('base64url');
    const sign = createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    return `${header}.${payload}.${sign.sign(sa.private_key, 'base64url')}`;
}

async function getToken() {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${createJWT(serviceAccount)}`
    });
    const d = await res.json();
    return d.access_token;
}

const PROJECT_ID = 'training-centers-map';
const DOC_ID = '7CSpOG2rU6fzb95XwAlf'; // KB증권 연수원 Document ID

async function run() {
    const token = await getToken();

    // PATCH: location 필드 추가
    const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/trainingCenters/${DOC_ID}?updateMask.fieldPaths=location`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                location: {
                    mapValue: {
                        fields: {
                            lat: { doubleValue: 37.3099082 },
                            lng: { doubleValue: 127.1348 }
                        }
                    }
                }
            }
        })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
    }

    console.log(`✅ KB증권 연수원 location 업데이트 완료!`);
    console.log(`   lat: 37.3099082, lng: 127.1348`);
    process.exit(0);
}

run().catch(err => {
    console.error('❌', err.message);
    process.exit(1);
});

import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.firebasestorage.app",
    messagingSenderId: "943690141587",
    appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

async function fixLinks() {
    console.log("시작: Firestore 데이터 마이그레이션 (네이버 링크 <-> 웹사이트 링크 스왑)");

    try {
        const querySnapshot = await getDocs(collection(db, "trainingCenters"));
        let updatedCount = 0;

        for (const document of querySnapshot.docs) {
            const data = document.data();
            const links = data.links;

            // links 객체가 존재하고 두 키가 모두 있을 때만 스왑
            if (links && links.naver && links.website) {
                // 기존 값 백업
                const oldNaver = links.naver;
                const oldWebsite = links.website;

                // 스왑 (서로 값을 교체)
                const newLinks = {
                    naver: oldWebsite,
                    website: oldNaver
                };

                await updateDoc(doc(db, "trainingCenters", document.id), {
                    links: newLinks
                });

                updatedCount++;
                console.log(`[OK] 업데이트 완료 ID: ${document.id}`);
            }
        }

        console.log(`완료: 총 ${updatedCount}개의 문서 링크가 정상적으로 스왑되었습니다.`);
        process.exit(0);

    } catch (error) {
        console.error("에러 발생:", error);
        process.exit(1);
    }
}

fixLinks();

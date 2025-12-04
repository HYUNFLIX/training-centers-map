// ==================== Firebase 공통 설정 ====================
// 모든 파일에서 이 설정을 사용하여 Firebase 초기화

export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDSPO1KqZgk1g7Oj7r128FDzrZi0VGcsxw",
    authDomain: "training-centers-map.firebaseapp.com",
    projectId: "training-centers-map",
    storageBucket: "training-centers-map.firebasestorage.app",
    messagingSenderId: "943690141587",
    appId: "1:943690141587:web:1a0bdd995ef6efbf662266"
};

// Firebase SDK 버전 (모든 파일에서 동일한 버전 사용)
export const FIREBASE_SDK_VERSION = "10.7.1";

// Firebase SDK URL 생성 헬퍼
export const getFirebaseUrl = (module) => {
    return `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-${module}.js`;
};

// Firebase 모듈 동적 로드 헬퍼
export async function loadFirebaseModules() {
    const [
        { initializeApp },
        { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc },
        { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
    ] = await Promise.all([
        import(getFirebaseUrl('app')),
        import(getFirebaseUrl('firestore')),
        import(getFirebaseUrl('auth'))
    ]);

    return {
        initializeApp,
        getFirestore,
        collection,
        getDocs,
        addDoc,
        doc,
        updateDoc,
        deleteDoc,
        getAuth,
        signInWithEmailAndPassword,
        onAuthStateChanged,
        signOut
    };
}

// Firebase 앱 초기화 (싱글톤 패턴)
let firebaseApp = null;
let firestoreDb = null;
let firebaseAuth = null;

export async function initializeFirebaseApp() {
    if (firebaseApp) {
        return { app: firebaseApp, db: firestoreDb, auth: firebaseAuth };
    }

    try {
        const modules = await loadFirebaseModules();

        firebaseApp = modules.initializeApp(FIREBASE_CONFIG);
        firestoreDb = modules.getFirestore(firebaseApp);
        firebaseAuth = modules.getAuth(firebaseApp);

        console.log('✅ Firebase 초기화 성공 (공통 설정 사용)');

        return {
            app: firebaseApp,
            db: firestoreDb,
            auth: firebaseAuth,
            modules
        };
    } catch (error) {
        console.error('❌ Firebase 초기화 실패:', error);
        throw error;
    }
}

// Firestore 컬렉션 이름 상수
export const COLLECTIONS = {
    TRAINING_CENTERS: 'trainingCenters',
    USERS: 'users'
};

console.log('✅ firebase-config.js 로드 완료');

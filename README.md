# 연수원 여기어때 (Training Centers Map)

"연수원 여기어때"는 전국에 위치한 연수원, 교육시설, 청소년 시설 등의 정보를 한눈에 확인하고 검색할 수 있는 지도 기반 웹 서비스입니다.

## 📌 주요 기능
- **전국 연수원 지도 보기**: 네이버 지도 API와 마커 클러스터링을 활용하여 전국의 연수원 위치를 직관적으로 제공합니다.
- **연수원 검색 기능**: 연수원 이름, 지역, 주소 등을 입력하여 원하는 시설을 빠르게 찾을 수 있습니다.
- **조건별 필터링**: 지역별, 수용인원별 조건에 맞춰 연수원을 필터링할 수 있습니다.
- **인기 및 최근 검색어 지원**: 최근에 검색한 내역과 인기 연수원 TOP 5를 제공하여 사용자 편의성을 높였습니다.
- **청소년 시설 포함 여부 토글**: 청소년 수련시설을 결과에 포함할지 여부를 선택할 수 있습니다.
- **PWA (Progressive Web App) 지원**: 모바일 환경에서도 앱처럼 설치하고 사용할 수 있습니다.

## 🛠 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Map API**: Naver Maps API v3
- **Backend / Database**: Firebase (Firestore, Hosting 등)
- **Icons & Fonts**: FontAwesome, Google Noto Sans KR

## 🚀 라이브 서비스 (Live Service)
- 링크: [https://training-centers-map.web.app](https://training-centers-map.web.app)

## 📂 주요 파일 구조
- `index.html`: 메인 지도 화면
- `centers-list.html`: 연수원 목록 화면
- `app.js` / `centers-list.js`: 주요 로직 처리
- `style.css`: 전체 스타일링
- `firebase.json` / `firebase-config.js` / `firestore.rules`: Firebase 관련 설정 파일
- `admin/`: 관리자 전용 페이지 및 대시보드
- `scripts/`: 데이터 및 관리자 작업을 위한 보조 스크립트 모음

## 📄 라이선스 및 저작권
- COPYRIGHT © 2026 [AI LEADERSHIP LAB](https://leadership.ai.kr/). All Rights Reserved.
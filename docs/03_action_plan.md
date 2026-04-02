# 📋 액션 플랜 — 전체 로드맵

> 마지막 업데이트: 2026-03-27 22:40 KST

---

## ✅ 완료된 것 (3/27 기준)

### 인프라
- [x] Neon DB 가입 + API Key 발급 + 6개 테이블 생성
- [x] GitHub repo 생성 + push (blingat/workflow-pipeline)
- [x] Netlify Token 발급
- [x] 서버 타임존 Asia/Seoul 설정
- [x] Webshare 프록시 10개 확보 (보험용)
- [x] Samba 설정 (서버 폴더 공유)

### 계정
- [x] 이메일 2개 생성 (qmfflddot@gmail.com, vhzmfla@gmail.com)
- [x] Threads 계정 2개 생성/확보 (bbar_coder, ai.pacaa)
- [x] AI파카 에이징 대상 계정 10개 발굴

### 개발
- [x] 대시보드 웹앱 (9페이지 + API 7개)
- [x] DB 스키마 + 시드 데이터 + 페르소나 2개
- [x] HEARTBEAT.md 상시 감시 설정
- [x] 스킬 3개 (collector/analyzer/publisher)
- [x] 수집 설정 페이지 (키워드/주기/가중치)
- [x] Slack 채널 연동

### 브라우저 자동화
- [x] Playwright + Chromium + Stealth 설치
- [x] Chrome User Data 영속화 (재로그인 불필요)
- [x] ai.pacaa 인스타 로그인 + 세션 유지
- [x] @itsshibaai 피드 41개 스크래핑 + 분석
- [x] Xvfb + FFmpeg 영상 자동 생성 테스트
- [x] Bing 검색 스텔스 동작 (search.js)
- [x] 안티디텍트 불필요 확정
- [x] 에이징 스크립트 (aging.js) 작성 + Cron 등록

---

## 📌 에이징 기간 (2026-03-27 ~ 2026-04-10)

### 사용자가 할 것 (집 PC)
- 매일 20~30분 threads.net에서 자연스럽게 활동
- 좋아요 10~15개, 팔로우 3~5개, 댓글 1~2개
- Day 4~: 수동 발행 1~2개/일
- Day 8~: 발행 3~5개/일
- ❌ 폰 앱 접속 금지
- ❌ 서버와 동시 접속 금지

### OpenClaw가 할 것 (서버)
- 에이징 Cron: 매일 14:00 KST (stagger 40m, 2~40분 랜덤)
- **사용자 수동 에이징 시 서버 스크립트 종료 필수**
- 에이징 대상: @specal1849, @geumverse_ai, @realaiforyou, @gpt_park, @rosy_.designer, @jaykimuniverse, @dev.haesummy, @aitrendmaster, @dev_shibaa, @itsshibaai

---

## 📌 에이징 중 개발 (3/27 ~ 4/10)

| 작업 | 담당 | 상태 |
|------|------|------|
| 수집 스크립트 (키워드→DB) | OpenClaw | [ ] |
| 발행 스크립트 (DB→Threads) | OpenClaw | [ ] |
| GLM-5 분석 연동 | OpenClaw | [ ] |
| Netlify 배포 | OpenClaw | [ ] |
| 본계 bbacoder 인스타 생성 | 사용자 | [ ] (에이징 후) |

---

## 📅 에이징 후 (4/10~)

### 1주차 (4/10 ~ 4/16): 자동화 가동
- [ ] 서브 자동 발행 시작 (2H 간격 12개/일)
- [ ] 수집→분석→발행 파이프라인 전체 연결
- [ ] Netlify 대시보드 실배포
- [ ] OpenClaw cron 등록 (수집 2H / 분석 6H / 발행 1H)

### 2주차 (4/17 ~ 4/23): 수익화
- [ ] 디지털 상품 출시 ("AI 툴 가이드 2026" 9,900원)
- [ ] ai.pacaa 프로필 링크 연결
- [ ] 터진 글 → 본계(빠코더) 이동 테스트

### 3주차~ (4/24~): 확장
- [ ] X API 크로스포스팅
- [ ] 수익형 서비스 제작 (상세페이지 자동화 or 외주 포트폴리오)
- [ ] 서브2 확장 (수익 안정화 후)

---

## 🔑 핵심 원칙

```
1. 에이징 기간(14일)에 절대 자동 발행 X
2. 본계와 서브 절대 같은 IP/기기에서 동시 접속 X
3. 본계에서 "바이브코딩" 단어 사용 X
4. 서브 글 본문에 링크 넣기 X (프로필 링크만)
5. 같은 문구 2번 사용 X (AI 변형 필수)
6. 수익형 서비스 없이는 본계 의미 없음 → 서비스 먼저 만들기
7. 폰 앱 접속 금지 (에이징은 집 PC만)
8. 서버와 사용자 동시 접속 금지
```

---

## 📂 파일 구조

```
workflow-pipeline/
├── docs/
│   ├── 01_ai_paca_guide.md    ← AI파카 서브계정 운영 가이드
│   ├── 02_final_design.md     ← 최종 설계안 v3
│   ├── 03_action_plan.md      ← 이 문서 (액션 플랜)
│   └── final_design.md        ← v3 전체 (백업)
├── browser_data/ai_pacaa/     ← Chrome User Data (세션 영속화)
├── aging.js                   ← 에이징 자동 스크립트
├── search.js                  ← Bing 검색 (스텔스)
├── persistent_session.js      ← 세션 테스트
├── scrape_itsshibaai.js       ← 피드 스크래핑
├── test_login.js              ← 로그인 테스트
├── test_video.js              ← 영상 녹화 테스트
└── ... (Next.js 프로젝트)
```

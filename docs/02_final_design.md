# Workflow Pipeline — 최종 설계안 v3

> 업데이트: 2026-03-27 22:40 KST

## 0. 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 프로젝트명 | workflow-pipeline |
| GitHub | `blingat/workflow-pipeline` |
| 기술 스택 | Next.js (App Router) + Tailwind CSS + JavaScript |
| DB | Neon (Serverless Postgres) |
| AI 엔진 | GLM-5-Turbo |
| SNS 발행 | Playwright + Stealth (threads.net 직접 접속) |
| 자동화 | OpenClaw (24시간 에이전트) |
| 서버 | Ubuntu, 서울 KT IP (59.9.200.83), KST 타임존 |

---

## 1. 계정 구成

| 계정 | ID | PW | 이메일 | 운영 환경 | IP | 역할 |
|------|-----|-----|--------|----------|-----|------|
| **본계 (빠코더)** | bbar_coder | tkdfhrtn0! | qmfflddot@gmail.com | 사용자 폰 (수동) | 폰 IP | 외주 결과물 인증 + 수익화 |
| **서브1 (AI파카)** | ai.pacaa | tkdfhrtn0! | vhzmfla@gmail.com | Ubuntu 서버 (자동) + 집 PC (수동 에이징) | 서버 KT 서울 | AI 꿀팁 난사 + 트래픽 테스트 |

### 중요 규칙
- 본계와 서브 **절대 상호작용 금지**
- **동시 접속 금지** — 서버 스크립트와 사용자 동시 접속 불가
- IP 이미 분리됨 → **안티디텍트 불필요, 프록시 불필요**
- 에이징은 **집 PC 브라우저**에서 (서버 Playwright와 동일 데스크탑 환경)
- **폰 앱 접속 금지** — 디바이스 핑거프린트 불일치

---

## 2. 안티디텍트 결정 (최종)

**안티디텍트 브라우저 불필요.**

| 옵션 | 결과 | 이유 |
|------|------|------|
| AdsPower | ❌ | 무료 버전 API 불가 |
| Dolphin Anty | ❌ | Linux 미지원 |
| GoLogin | ❌ | 7일 무료만, 유료 $49/월 |
| Nstbrowser | ❌ | 불필요 |
| Windows VM | ❌ | 리소스 낭비 |
| **Playwright Stealth** | ✅ 채택 | IP 분리 + User Data 고정으로 충분 |

---

## 3. 서버 인프라

### 브라우저 자동화
- **Playwright + Chromium** (headless, stealth, playwright-extra)
- **Chrome User Data 영속화**: `browser_data/ai_pacaa/` (쿠키/세션 유지)
- **Xvfb** — 가상 디스플레이 (:99, 1920x1080)
- **FFmpeg** — 화면 녹화 (H.264, 15fps)
- 영상 생성: Xvfb + Playwright 조작 + FFmpeg = 자동 데모 영상

### 웹 검색
| 엔진 | 상태 | 비고 |
|------|------|------|
| Google | ❌ 차단 | 서버 IP CAPTCHA |
| DuckDuckGo | ❌ 차단 | 서버 IP 봇탐지 |
| **Bing** | ✅ 사용 | Stealth Playwright로 정상 |
| web_fetch | ✅ 사용 | 특정 URL 직접 접속 |
| `search.js` | ✅ | `node search.js "검색어" [수]` |

---

## 4. 파이프라인 (5단계)

```
1.수집 → 2.분석 → 3.큐레이션 → 4.승인 → 5.발행
```

### 4-1. 수집 (Collector)
- Playwright → threads.net 검색 → 키워드별 상위 20개 → DB 저장
- 2시간 간격, 1회 50~100개
- 인기도: `(likes×1 + reposts×3 + replies×2) / max(views,1) × 1000`

### 4-2. 분석 (Analyzer)
- GLM-5로 유형 분류 / 후킹 패턴 / 역발상 각도 / 재가공 프롬프트
- 키워드 빈도 → 200%+ 급등 감지 → 신규 출현 감지
- 6시간 간격

### 4-3. 큐레이션 (Curator)
- 대시보드 콘텐츠 풀에서 AI 분석 결과 제공
- "글감으로 채택" → 페르소나 적용 → 콘텐츠 생성

### 4-4. 승인 (Approver)
- 대시보드에서 검토 → 승인/수정/삭제
- 승인 시 publish_queue 추가

### 4-5. 발행 (Publisher)
- Playwright → threads.net 로그인 → 글 작성 → 게시
- 발행 10분 후 조회수 500+ → "터짐" 마킹 → 본계 후보

---

## 5. 완료된 것

- [x] 대시보드 웹앱 (9페이지 + API 7개)
- [x] DB 스키마 6개 테이블 + 시드 데이터
- [x] GitHub repo + push
- [x] 페르소나 2개 (빠코더 전문가, AI파카)
- [x] 스킬 3개 (collector/analyzer/publisher)
- [x] 수집 설정 페이지 (키워드/주기/가중치)
- [x] HEARTBEAT.md 상시 감시 설정
- [x] Slack 채널 연동
- [x] Threads 계정 2개 정보 + 이메일 확보
- [x] Webshare 프록시 10개 확보 (보험용)
- [x] Playwright + Chromium + Stealth 설치
- [x] Chrome User Data 영속화 (재로그인 불필요)
- [x] ai.pacaa 인스타 로그인 + 세션 유지
- [x] @itsshibaai 피드 41개 스크래핑 + 분석
- [x] Xvfb + FFmpeg 영상 자동 생성 테스트
- [x] Bing 검색 스텔스 동작 확인
- [x] 안티디텍트 불필요 확정
- [x] 에이징 대상 한국 AI 크리에이터 10개 발굴
- [x] 에이징 스크립트 (aging.js) 작성
- [x] 에이징 Cron 등록 (매일 14:00 KST, stagger 40m)
- [x] 서버 타임존 Asia/Seoul 설정

---

## 6. 다음 단계 (우선순위순)

### Phase 1: 자동화 엔진
- [ ] **수집 스크립트** — 키워드 검색 → 게시물 파싱 → DB(collected_posts) 저장
- [ ] **발행 스크립트** — DB(publish_queue) 글 → threads.net 게시

### Phase 2: AI 연동
- [ ] GLM-5 분석 로직 실제 연동 (현재 mock)
- [ ] 콘텐츠 자동 생성 (페르소나 적용)

### Phase 3: 배포 & 스케줄
- [ ] Netlify 배포 연결
- [ ] OpenClaw cron 등록 (수집 2H / 분석 6H / 발행 1H)

### Phase 4: 에이징 & 운영 (사용자)
- [ ] AI파카 에이징 Day 1~14 (집 PC에서 수동)
- [ ] 본계 bbacoder 인스타 생성 (에이징 후)
- [ ] Day 15~ 자동 발행 시작

---

## 7. 환경 변수

```env
DATABASE_URL=postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
THREADS_SUB1_ID=ai.pacaa
THREADS_SUB1_PW=tkdfhrtn0!
THREADS_SUB1_EMAIL=vhzmfla@gmail.com
THREADS_MAIN_ID=bbar_coder
THREADS_MAIN_PW=tkdfhrtn0!
THREADS_MAIN_EMAIL=qmfflddot@gmail.com
```

## 8. 주의사항
- 본계 "바이브코딩" 금지, 고객 타겟 키워드만
- .env.local GitHub 업로드 절대 금지
- 에이징 14일 없이 자동 발행 = 밴
- 같은 문구 2번 사용 금지 (AI 변형 필수)
- 발행 간격 2~3H 최소
- 스크래핑 2H 간격, 1회 50~100개 (Meta IP 차단 주의)
- 서버와 사용자 동시 접속 금지
- 폰 앱 접속 금지 (에이징은 집 PC만)

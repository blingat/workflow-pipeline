# 🧵 쓰레드 자동화 시스템 — 최종 설계안

> **이 문서가 전체 시스템의 유일한 설계 기준이다.**
> 오픈클로는 이 문서를 기반으로 모든 개발과 자동화를 수행한다.
> 마지막 업데이트: 2026-03-27

---

## 0. 프로젝트 정보

| 항목 | 값 |
|------|-----|
| 프로젝트명 | threads-pipeline |
| GitHub | `blingat/threads-pipeline` |
| 기술 스택 | Next.js (App Router) + Tailwind CSS + JavaScript |
| DB | Neon (Serverless Postgres) |
| 배포 | Netlify |
| AI 엔진 | GLM-5-Turbo (오픈클로 연동) |
| SNS 발행 | 오픈클로가 Threads API / X API 직접 호출 |
| 자동화 | 오픈클로 (24시간 자율 에이전트) |

---

## 1. 환경 변수 & API 키

프로젝트 루트 `.env.local`에 세팅. `.gitignore`에 반드시 추가.

```env
# ── DB ──
DATABASE_URL=postgresql://...@ep-xxxx.neon.tech/dbname?sslmode=require

# ── GitHub ──
GITHUB_TOKEN=ghp_xxxxxxxxxxxx

# ── Netlify ──
NETLIFY_TOKEN=nfp_xxxxxxxxxxxx
NETLIFY_SITE_ID=xxxxxxxx-xxxx-xxxx-xxxx

# ── Threads API (Meta 개발자 계정) ──
THREADS_API_TOKEN=쓰레드_API_액세스_토큰

# ── X API (나중에 추가 시) ──
# X_API_KEY=
# X_API_SECRET=

# ── Threads 계정 (오픈클로 스킬에서 사용) ──
THREADS_MAIN_ID=빠코더 인스타 아이디
THREADS_MAIN_PW=비밀번호
THREADS_SUB1_ID=AI파카 인스타 아이디
THREADS_SUB1_PW=비밀번호
```

---

## 2. 2계정 운영 전략

> 처음부터 3계정은 과부하. **2계정으로 시작, 수익 발생 후 서브2 확장.**

```
AI파카 (서브, 자동) ─── 하루 12개 난사
  │                      터진 글 발견 → 본계 이동
  │
빠코더 (본계, 수동) ─── 서브에서 검증된 글 + 외주 결과물 인증
                         고정글에 서비스 링크
```

| 계정 | ID | 역할 | 발행 | 페르소나 |
|------|----|------|------|----------|
| **본계** | `bbacoder` | 외주 결과물 인증 + 수익화 | 수동 2~3/일 | 빠코더 전문가 |
| **서브1** | `ai_paca` | AI 꿀팁 난사 + 트래픽 테스트 + 소액 상품 | 자동 2H간격 12/일 | AI파카 |

### 계정 분리

| 계정 | 운영 환경 |
|------|----------|
| 본계 (빠코더) | 형 폰에서 수동 운영 (안티디텍트 불필요) |
| 서브1 (AI파카) | AdsPower 프로필 1 + Webshare 프록시 |

> **본계와 서브는 절대 상호작용 금지** (좋아요/댓글/팔로우 X)

---

## 3. 파이프라인 (5단계)

```
1.수집 → 2.분석 → 3.큐레이션 → 4.승인 → 5.발행
```

### 3-1. 수집 (Collector)
- 오픈클로 Playwright 직접 스크래핑 (무료)
- threads.net 검색탭 → 키워드별 상위 20개 → DB 저장
- 2시간 간격, 1회 50~100개
- 인기도: `(likes×1 + reposts×3 + replies×2) / max(views,1) × 1000`

### 3-2. 분석 (Analyzer)
- GLM-5로 유형 분류 / 후킹 패턴 / 역발상 각도 / 재가공 프롬프트 생성
- 키워드 빈도 → 200%+ 급등 감지 → 신규 출현 감지
- 6시간 간격

### 3-3. 큐레이션 (Curator)
- 대시보드 콘텐츠 풀에서 AI 분석 결과 제공
- "글감으로 채택" → 페르소나 적용 → 콘텐츠 생성

### 3-4. 승인 (Approver)
- 대시보드에서 검토 → 승인/수정/삭제
- 승인 시 publish_queue 추가

### 3-5. 발행 (Publisher)
- 오픈클로가 Threads API 직접 호출 (Postiz 미사용)
- 나중에 X API 추가 시 같은 방식으로 확장
- 발행 10분 후 조회수 500+ → "터짐" 마킹 → 본계 후보

---

## 4. DB 스키마

```sql
CREATE TABLE collected_posts (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR UNIQUE,
  author VARCHAR,
  content TEXT,
  likes INT DEFAULT 0,
  reposts INT DEFAULT 0,
  replies INT DEFAULT 0,
  views INT DEFAULT 0,
  engagement_score FLOAT,
  hashtags TEXT[],
  created_at TIMESTAMP,
  collected_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE analysis_results (
  id SERIAL PRIMARY KEY,
  post_id VARCHAR REFERENCES collected_posts(post_id),
  content_type VARCHAR,    -- traffic / insight / counter / trend
  hooking_pattern TEXT,
  counter_angle TEXT,
  suggested_prompt TEXT,
  trend_keywords TEXT[],
  analyzed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE publish_queue (
  id SERIAL PRIMARY KEY,
  persona_id VARCHAR,
  content TEXT,
  status VARCHAR DEFAULT 'pending',  -- pending / approved / published / failed / viral
  scheduled_at TIMESTAMP,
  published_at TIMESTAMP,
  account VARCHAR,          -- main / sub1
  engagement_after JSONB    -- {views, likes, reposts, replies}
);

CREATE TABLE personas (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  version VARCHAR DEFAULT '1.0.0',
  tone TEXT,
  emoji_usage VARCHAR,
  content_length VARCHAR,
  base_prompt TEXT,
  target_audience TEXT,
  linked_account VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE keyword_trends (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR,
  date DATE,
  mention_count INT,
  growth_rate FLOAT,
  is_new BOOLEAN DEFAULT FALSE,
  category VARCHAR
);
```

### 시드 데이터 (페르소나 2개)

```sql
INSERT INTO personas VALUES
('persona_a', '빠코더 전문가', '1.0.0', '결과물로 증명하는 간결한 전문가', 'minimal', '3~5줄',
 '당신은 AI를 활용해 실제 결과물을 내는 전문 개발자입니다.
## 규칙
- 결과물과 수치로만 증명합니다
- "바이브코딩"이라는 단어를 절대 사용하지 않습니다
- 고객 타겟 키워드를 사용합니다: "병원 홈페이지", "쇼핑몰 상세페이지", "CRM 자동화"
- 간결하고 자신감 있게, 3~5줄 이내
## 금지
- 이모지 남발, 개발 용어 남발, 허세',
 '자영업자, 스타트업, 외주 의뢰인', 'main', NOW(), NOW()),

('persona_b', 'AI파카', '1.0.0', '가볍고 자극적, 어그로', 'heavy', '2~4줄',
 '당신은 AI/IT 꿀팁을 공유하는 알파카 캐릭터 계정입니다.
## 규칙
- 짧고 강렬하게, 2~4줄
- 첫 줄에서 시선을 끌어야 합니다 (질문, 도발, 수치)
- 이모지 적극 사용, 🦙 알파카 이모지 가끔 사용
- 리포스트 욕구 자극하는 체크리스트/꿀팁/무료대안 형태 선호
- 반말 사용
## 금지
- 길게 쓰기, 전문 용어 남발',
 'IT 관심 일반인, 개발 입문자', 'sub1', NOW(), NOW());
```

---

## 5. 대시보드 웹앱 (Next.js)

### 5-1. 디자인 시스템

| 항목 | 값 |
|------|-----|
| 배경 | `#0a0a1a` |
| 카드 배경 | `rgba(255,255,255,0.05)` + `backdrop-filter: blur(10px)` |
| 포인트 | `#00ff88` |
| 보조 | `#00d4ff` |
| 위험 | `#ff4444` |
| 경고 | `#ffaa00` |
| 폰트 | Inter (Google Fonts) |

### 5-2. 라우트 & API

**페이지:**
```
/                  메인 대시보드 (파이프라인 모니터링)
/accounts          계정 관리 (본계/서브1)
/personas          페르소나 & 프롬프트 관리 (CRUD)
/content-pool      콘텐츠 풀 (수집된 글감 + AI 분석)
/queue             발행 대기열 (승인/수정/삭제/스케줄)
/trends            트렌드 캐치 (키워드 급등 + 신규 출현)
/analytics         성과 분석
/settings          설정
```

**API Routes:**
```
/api/posts         → collected_posts     GET / POST / PUT / DELETE
/api/analysis      → analysis_results    GET / POST
/api/queue         → publish_queue       GET / POST / PUT / DELETE
/api/personas      → personas            GET / POST / PUT / DELETE
/api/trends        → keyword_trends      GET / POST
/api/preview       → GLM-5 호출 → 샘플 글 생성 (POST)
```

### 5-3. 페이지별 기능

**메인 `/`** — 파이프라인 플로우, 전체 현황 카드, 계정별 현황, NEXT IN QUEUE 미리보기, 24시간 발행 타임라인

**계정 관리 `/accounts`** — 카드 2장 (본계/서브1), 상태(Active/Warmup), 사이클 조정, 일시중지/재개

**페르소나 `/personas`** — 카드 목록 CRUD, 편집 모달 (BASE PROMPT 에디터), 미리보기 생성, 버전 히스토리

**콘텐츠 풀 `/content-pool`** — 수집 리스트, 필터(유형별), AI 분석 결과, "글감 채택" → 콘텐츠 생성 모달

**발행 대기열 `/queue`** — 테이블, 상태별 색상, 수정/삭제/성과보기, "터짐" → 본계 이동 버튼

**트렌드 `/trends`** — 급등 키워드 랭킹, 신규 출현 키워드, 7일 추이 차트

**성과 `/analytics`** — 계정별 발행 성과 차트, 터진 글 TOP 10, 페르소나별 평균 성과

**설정 `/settings`** — 연결 상태, 수집 키워드 관리, 주기 조정, 텔레그램 알림

---

## 6. 오픈클로 스킬 (3개)

`~/.openclaw/workspace/skills/`에 생성.

### threads_collector
- 트리거: "쓰레드 수집" / "threads collect"
- 스케줄: `0 */2 * * *` (2시간마다)
- 동작: Playwright → threads.net 검색 → 키워드별 상위 20개 파싱 → DB 저장

### threads_analyzer
- 트리거: "쓰레드 분석" / "threads analyze"
- 스케줄: `30 */6 * * *` (6시간마다)
- 동작: 상위 30개 글감 분석 → 유형 분류/후킹 패턴/역발상 각도 → 키워드 트렌드 감지

### threads_publisher
- 트리거: "쓰레드 발행" / "threads publish"
- 스케줄: `0 * * * *` (1시간마다)
- 동작: publish_queue에서 approved + 시각 도래 → 페르소나 적용 → Threads API 직접 발행

---

## 7. HEARTBEAT.md (오픈클로 상시 감시)

```
- 매 5분마다 Netlify 배포 사이트 응답 체크
  → 응답 없으면 텔레그램 알림

- 매 1시간마다 publish_queue에서 failed 항목 체크
  → 3개 이상이면 텔레그램 경고

- 매일 12:00, 23:00 일간 리포트 작성
  → 발행 수, 조회수, 터진 글, 트렌드 키워드

- 발행 10분 후 조회수 500+ 발견 시
  → 텔레그램: "🔥 터질 조짐! {계정}에서 조회수 {N}"
```

---

## 8. 주의사항

- **스크래핑 속도**: 2시간 간격, 1회 50~100개. Meta IP 차단 주의.
- **에이징 필수**: 신규 계정 즉시 자동발행 = 밴. 14일 워밍업 후 자동화.
- **AI 비용**: GLM-5 위주. Claude는 코드 개발 시에만. 분석에 쓰면 월 100만+.
- **본계 바이브코딩 금지**: 고객 타겟 키워드만 사용.
- **.env.local 보안**: GitHub 업로드 절대 금지.
- **계정 분리**: 본계/서브 같은 IP 접속 금지. AdsPower + 별도 프록시 필수.

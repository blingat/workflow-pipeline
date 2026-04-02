# Workflow Pipeline — AI파카 Threads 자동화

## 개요
AI파카 페르소나 기반 Threads(SNS) 콘텐츠 자동화 파이프라인.  
수집 → 분석 → 발행 대기 → 자동 발행 → 에이징(계정 warming)의 전 과정을 관리.

## 기술 스택
- **Frontend**: Next.js 14 + Tailwind CSS + Recharts
- **DB**: Neon (PostgreSQL serverless)
- **Browser Automation**: Playwright + Stealth Plugin
- **카드 이미지 생성**: Satori + Resvg
- **런타임**: Node.js 22, OpenClaw 헤드리스 환경

## 프로젝트 구조
```
workflow-pipeline/
├── app/                      # Next.js 대시보드 UI
│   ├── dashboard/            # 메인 대시보드
│   ├── accounts/             # 계정 관리
│   ├── personas/             # 페르소나 설정
│   ├── collector/            # 수집 현황
│   ├── content-pool/         # 콘텐츠 풀
│   ├── queue/                # 발행 큐
│   ├── trends/               # 트렌드 분석
│   ├── analytics/            # 통계/분석
│   ├── aging-log/            # 에이징 로그
│   ├── pipeline-log/         # 파이프라인 실행 로그
│   ├── settings/             # 설정
│   └── api/                  # REST API 엔드포인트
│       ├── aging-config/     # 에이징 설정
│       ├── aging-log/        # 에이징 로그 API
│       ├── aging-logs/       # 에이징 로그 목록
│       ├── analysis/         # 분석 결과 API
│       ├── card/             # 카드 이미지 생성
│       ├── card-file/        # 카드 파일 API
│       ├── collector/        # 수집 API
│       ├── media/            # 미디어 업로드
│       ├── personas/         # 페르소나 API
│       ├── pipeline-logs/    # 파이프라인 로그 API
│       ├── posts/            # 게시물 API
│       ├── preview/          # 미리보기 API
│       ├── queue/            # 발행 큐 API
│       ├── stats/            # 통계 API
│       └── trends/           # 트렌드 API
├── components/               # React 컴포넌트
│   └── Sidebar.js            # 사이드바 네비게이션
├── scripts/                  # 유틸리티 스크립트
│   └── daily-report.js       # 일일 리포트 생성
├── docs/                     # 설계 문서
│   ├── 01_ai_paca_guide.md   # AI파카 가이드
│   ├── 02_final_design.md    # 최종 설계안
│   ├── 03_action_plan.md     # 액션 플랜
│   ├── 04_aging_design.md    # 에이징 설계
│   ├── 05_monitoring_design.md # 모니터링 설계
│   └── 06_master_design.md   # 마스터 설계
├── aging.js                  # 에이징 메인 (좋아요/팔로우/리포스트/댓글)
├── aging_pipeline.js         # 에이징 파이프라인
├── collector.js              # 콘텐츠 수집기
├── analyzer.js               # 콘텐츠 분석기
├── publisher.js              # 콘텐츠 발행기
├── card_generator.js         # OG 카드 이미지 생성
├── pipeline.js               # 전체 파이프라인 오케스트레이터
├── stealth_utils.js          # Playwright Stealth 유틸
└── next.config.js            # Next.js 설정
```

## DB 스키마 (Neon PostgreSQL)
- `collected_posts` — 수집된 게시물
- `analysis_results` — 분석 결과
- `publish_queue` — 발행 큐
- `personas` — 페르소나 설정
- `keyword_trends` — 키워드 트렌드
- `collector_config` — 수집 설정

## 계정
- **빠코더** (본계): bbar_coder
- **AI파카** (서브): ai.pacaa

## 실행
```bash
# 대시보드
npm run dev

# 에이징 (Xvfb 필수)
DISPLAY=:5901 node aging.js
```

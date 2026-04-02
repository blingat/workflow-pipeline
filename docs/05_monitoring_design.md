# 서버 모니터링 & 일일 리포트 설계안

## 1. 서버 이슈 감시 & 알림

### 구현 방식: HEARTBEAT.md 체크리스트 (OpenClaw 네이티브)

OpenClaw의 Heartbeat는 30분마다 자동으로 에이전트를 실행시켜 HEARTBEAT.md를 읽고 수행. 별도 데몬 불필요.

### HEARTBEAT.md 체크리스트

```markdown
# HEARTBEAT.md

## 서버 상태 점검 (매 30분)
1. `openclaw gateway status` 정상 확인 → 비정상 시 텔레그램 알림
2. `pgrep -x Xvfb` 확인 → 안 떠 있으면 자동 재시작 + 알림
3. `pgrep -f websockify` 확인 → 안 떠 있으면 자동 재시작 + 알림
4. 디스크 사용률 > 80% → 알림
5. 메모리 사용률 > 90% → 알림

## 에이징 대시보드 (매 1시간)
1. publish_queue에서 failed 항목 수 → 3개 이상이면 텔레그램 경고

## 실시간 터짐 감지 (에이징 실행 중)
1. 발행 10분 후 조회수 500+ 발견 → 텔레그램: "터질 조짐! {계정} 조회수 {N}"

## 비활성 시간 (23:00~08:00)
- HEARTBEAT_OK 반환 (알림 없음)
```

### 장점
- **OpenClaw 내장 기능** → 별도 프로세스/설치 불필요
- **isolatedSession: true** → 토큰 비용 최소화 (2~5K/회)
- **activeHours 설정** → 야간에는 토큰 낭비 없이 스킵
- **lightContext: true** → HEARTBEAT.md만 로드, 전체 대화 히스토리 불필요

### 설정
```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",
        target: "last",        // 마지막 대화 채널(텔레그램)로 알림
        isolatedSession: true, // 토큰 절약
        lightContext: true,    // HEARTBEAT.md만 로드
        activeHours: {
          start: "08:00",
          end: "23:30"
        }
      }
    }
  }
}
```

---

## 2. 매일 낮/밤 업무 리포트

### 구현 방식: OpenClaw Cron (2개 등록)

#### 🌞 낮 리포트 — 매일 12:00 KST
```
openclaw cron add \
  --name "daily-noon-report" \
  --cron "0 12 * * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --light-context \
  --message "일일 낮 리포트 작성. 아래 항목을 DB에서 조회하여 텔레그램으로 전송:

1. 오늘 수집된 글 수 (collected_posts WHERE collected_at >= TODAY)
2. 오늘 분석된 글 수 (analysis_results WHERE analyzed_at >= TODAY)
3. 발행 대기/완료/실패 수 (publish_queue WHERE published_at >= TODAY)
4. 에이징 결과 (오늘 실행했으면 /tmp/aging_result.json)
5. 키워드 트렌드 상위 5 (keyword_trends)

형식:
📊 AI파카 일일 리포트 (3/28 낮)

📈 파이프라인
- 수집: N개 | 분석: N개 | 발행: N개
- 대기: N개 | 실패: N개

🦙 에이징
- 좋아요: N개 | 팔로우: N개 | 리포스트: N개 | 댓글: N개

🔥 트렌드 키워드
1. 키워드 (성장률 +N%)
2. ..."

--announce
```

#### 🌙 밤 리포트 — 매일 23:00 KST
```
openclaw cron add \
  --name "daily-night-report" \
  --cron "0 23 * * *" \
  --tz "Asia/Seoul" \
  --session isolated \
  --light-context \
  --message "일일 밤 리포트 작성. DB에서 당일 전체 집계 후 텔레그램으로 전송:

1. 당일 총 수집/분석/발행 수
2. publish_queue 누적 상태 (pending/approved/published/failed/viral)
3. 에이징 누적 통계
4. 서버 상태 (디스크/메모리)
5. 내일 예정 작업

형식:
🌙 AI파카 일일 마감 (3/28)

📊 당일 요약
- 수집 N개 → 분석 N개 → 발행 N개
- 큐 누적: 대기 N | 승인 N | 완료 N | 실패 N

🦙 에이징 누적
- 오늘: 좋아요 N | 팔로우 N | 리포스트 N | 댓글 N

🖥️ 서버
- 디스크: N% | 메모리: N%
- OpenClaw: 정상

📋 내일 예정
- 에이징 자동 실행 (10:00~11:00)
- 수집 2회 (06:00, 18:00)"

--announce
```

### 토큰 비용
- Heartbeat 30분 간격, activeHours 15.5시간 → **약 31회/일**
- isolatedSession + lightContext → **약 150K 토큰/일** (매우 저렴)
- Cron 리포트 2회/일 → **약 10K 토큰/일**

---

## 3. 커뮤니티 꿀팁 (2026.2~3월)

### OpenClaw Discord/블로그에서 발견한 유용 정보

1. **isolatedSession 필수** — Heartbeat/Cron에서 `isolatedSession: true`로 설정하면 대화 히스토리를 안 보내서 토큰 비용이 95% 절감됨 (100K→2~5K)

2. **lightContext 활용** — `lightContext: true`로 설정하면 AGENTS.md/SOUL.md 등 전체 부트스트랩 대신 HEARTBEAT.md만 로드. Heartbeat 전용 체크리스트에 최적화.

3. **activeHours로 야간 스킵** — `activeHours: { start: "08:00", end: "23:30" }`으로 설정하면 해당 시간대 밖에서는 Heartbeat가 아예 실행되지 않아 토큰 0소비.

4. **cron --announce** — Cron 작업 완료 후 결과를 채팅 채널(텔레그램 등)로 자동 전송. `--session isolated`와 조합하면 독립 세션에서 실행 후 결과만 전달.

5. **HEARTBEAT_OK 패턴** — Heartbeat에서 아무 일 없을 때 `HEARTBEAT_OK`만 반환하면 OpenClaw가 자동으로 드롭. 채팅에 스팸 안 감.

6. **compaction memoryFlush** — 대화가 길어지면 자동으로 `memory/YYYY-MM-DD.md`에 중요 정보를 저장. 수동 메모 안 해도 세션 간 컨텍스트 유지됨.

---

## 구현 순서

1. **HEARTBEAT.md 업데이트** — 서버 점검 체크리스트 작성
2. **openclaw.json 설정** — heartbeat 옵션 (isolatedSession, lightContext, activeHours)
3. **Cron 리포트 2개 등록** — 낮 12:00, 밤 23:00
4. **테스트** — `openclaw cron run`으로 수동 실행 확인

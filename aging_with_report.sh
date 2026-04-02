#!/bin/bash
# aging_with_report.sh — 에이징 실행 + 결과 보장 보고
# 사용법: bash aging_with_report.sh [초과시간(초)]

TIMEOUT=${1:-900}
LOG="/tmp/aging_report.log"
RESULT="/tmp/aging_result.json"

echo "=== 에이징 시작 $(date '+%Y-%m-%d %H:%M:%S') ===" > "$LOG"
echo "타임아웃: ${TIMEOUT}초" >> "$LOG"

DISPLAY=:5901 timeout "$TIMEOUT" node /home/kkk/.openclaw/workspace/workflow-pipeline/aging.js >> "$LOG" 2>&1
EXIT_CODE=$?

echo "" >> "$LOG"
echo "=== 종료 $(date '+%Y-%m-%d %H:%M:%S') (exit: $EXIT_CODE) ===" >> "$LOG"

# 결과 파싱
LIKES=$(grep "❤️ 좋아요:" "$LOG" | tail -1 | grep -oP '\d+개' | head -1 || echo "?")
FOLLOWS=$(grep "✅ 팔로우:" "$LOG" | tail -1 | grep -oP '\d+개' | head -1 || echo "?")
REPOSTS=$(grep "🔄 리포스트:" "$LOG" | tail -1 | grep -oP '\d+개' | head -1 || echo "?")
COMMENTS=$(grep "💬 댓글:" "$LOG" | tail -1 | grep -oP '\d+개' | head -1 || echo "?")

# 댓글 상세
COMMENT_DETAILS=$(grep "✅ 댓글#" "$LOG" | tail -3 || echo "")

# 팔로우 상세  
FOLLOW_DETAILS=$(grep "팔로우 신규#" "$LOG" | tail -5 || echo "")

# 보고 메시지 생성
MSG="📊 에이징 결과 $(date '+%H:%M')"

if [ $EXIT_CODE -ne 0 ]; then
  MSG="$MSG
⚠️ 비정상 종료 (exit: $EXIT_CODE)"
fi

MSG="$MSG
❤️ 좋아요: $LIKES
✅ 팔로우: $FOLLOWS
🔄 리포스트: $REPOSTS
💬 댓글: $COMMENTS"

if [ -n "$FOLLOW_DETAILS" ]; then
  MSG="$MSG
$FOLLOW_DETAILS"
fi

if [ -n "$COMMENT_DETAILS" ]; then
  MSG="$MSG
$COMMENT_DETAILS"
fi

# 텔레그램으로 발송 (OpenClaw CLI)
echo "$MSG" | openclaw send --channel telegram --chat 8467290584 2>/dev/null || echo "$MSG" > /tmp/aging_notify.txt

echo "$MSG" >> "$LOG"
echo "보고 완료" >> "$LOG"

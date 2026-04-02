#!/bin/bash
# aging_runner.sh v3 — xvfb-run + Stealth + Proxy
LOG="/tmp/aging_v5.log"
MAX_RETRIES=3
RETRY=0

> "$LOG"

cleanup() {
  pkill -9 -f "aging.js" 2>/dev/null
  rm -f /home/kkk/.openclaw/workspace/workflow-pipeline/browser_data/ai_pacaa/SingletonLock
  rm -f /home/kkk/.openclaw/workspace/workflow-pipeline/browser_data/ai_pacaa/SingletonCookie
  rm -f /home/kkk/.openclaw/workspace/workflow-pipeline/browser_data/ai_pacaa/SingletonSocket
}

echo "[$(date)] v5 러너 시작" >> "$LOG"

while [ $RETRY -lt $MAX_RETRIES ]; do
  cleanup
  sleep 3
  echo "[$(date)] 시도 #$((RETRY+1))" >> "$LOG"
  
  cd /home/kkk/.openclaw/workspace/workflow-pipeline
  xvfb-run -a --server-args="-screen 0 1920x1080x24" timeout 600 node aging.js >> "$LOG" 2>&1
  EXIT=$?
  echo "[$(date)] 종료 코드: $EXIT" >> "$LOG"
  
  RETRY=$((RETRY+1))
  sleep 10
done

cleanup
echo "[$(date)] 러너 종료" >> "$LOG"

#!/bin/bash
# VNC 서버 시작 스크립트 — Xvfb + fluxbox + 크롬

# 기존 VNC 종료
vncserver -kill :5901 2>/dev/null

# VNC 서버 시작 (해상도 1920x1080)
vncserver :5901 -geometry 1920x1080 -depth 24

# fluxbox (가벼운 창 관리자) 설치 & 실행
which fluxbox > /dev/null 2>&1 || echo 'tkdfhrtn0!' | sudo -S apt install -y fluxbox > /dev/null 2>&1
export DISPLAY=:5901
fluxbox &
sleep 1

# 환경 변수
export DISPLAY=:5901

echo "VNC 서버 시작됨"
echo "접속: 서버IP:5901"
echo "비밀번호: tkdfhrtn0!"

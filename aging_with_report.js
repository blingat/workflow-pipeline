#!/usr/bin/env node
// aging_with_report.js — 에이징 실행 + 결과 보장 보고
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TIMEOUT = parseInt(process.argv[2]) || 900; // 기본 15분
const LOG_FILE = '/tmp/aging_v7.log';
const REPORT_LOG = '/tmp/aging_report.log';

console.log(`=== 에이징 시작 ${new Date().toLocaleString('ko-KR')} (타임아웃: ${TIMEOUT}초) ===`);

try {
  execSync(
    `DISPLAY=:5901 timeout ${TIMEOUT} node ${path.join(__dirname, 'aging.js')}`,
    { timeout: (TIMEOUT + 30) * 1000, stdio: 'inherit', cwd: __dirname }
  );
  console.log('\n=== 정상 종료 ===');
} catch (e) {
  console.log(`\n=== 비정상 종료: ${e.message.substring(0, 80)} ===`);
}

// 로그에서 결과 파싱
const logContent = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, 'utf-8') : '';

const extract = (pattern) => {
  const match = logContent.match(pattern);
  return match ? match[1] : '?';
};

const likes = extract(/❤️ 좋아요:\s*(\d+개)/);
const follows = extract(/✅ 팔로우:\s*(\d+개)/);
const reposts = extract(/🔄 리포스트:\s*(\d+개)/);
const comments = extract(/💬 댓글:\s*(\d+개)/);

const followDetails = [...logContent.matchAll(/팔로우 신규#\d+ → (@[\w.]+)/g)].map(m => m[1]);
const commentDetails = [...logContent.matchAll(/✅ 댓글#\d+ → (@[\w.]+): "([^"]+)"/g)].map(m => `${m[1]}: "${m[2]}"`);

// 보고
let report = `📊 에이징 결과 ${new Date().toLocaleTimeString('ko-KR', { hour12: false })}
❤️ 좋아요: ${likes} | ✅ 팔로우: ${follows} | 🔄 리포스트: ${reposts} | 💬 댓글: ${comments}`;

if (followDetails.length > 0) report += `\n팔로우: ${followDetails.join(', ')}`;
if (commentDetails.length > 0) report += `\n${commentDetails.join('\n')}`;

fs.appendFileSync(REPORT_LOG, report + '\n');
console.log('\n' + report);

// 결과 파일 저장 (heartbeat나 다른 스크립트에서 읽기 가능)
fs.writeFileSync('/tmp/aging_last_result.txt', report);

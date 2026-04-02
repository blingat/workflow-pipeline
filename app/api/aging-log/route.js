import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const RESULT_FILE = '/home/kkk/.openclaw/workspace/workflow-pipeline/.aging_result.json';
const LAST_RESULT = '/tmp/aging_last_result.txt';

export async function GET() {
  const logs = [];

  // 최근 결과 파일에서 파싱
  try {
    if (existsSync(RESULT_FILE)) {
      const data = JSON.parse(readFileSync(RESULT_FILE, 'utf-8'));
      logs.push({
        ts: data.ts ? new Date(data.ts).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-',
        likes: data.actionLog?.likes?.length || 0,
        follows: data.newFollows || 0,
        reposts: data.actionLog?.reposts?.length || 0,
        comments: data.actionLog?.comments?.length || 0,
        elapsed: data.elapsed ? `${Math.floor(data.elapsed / 60)}분${data.elapsed % 60}초` : '-',
      });
    }
  } catch {}

  // 실행 중 확인
  let running = false;
  try {
    const result = execSync('pgrep -f "aging.js" | wc -l', { encoding: 'utf-8' }).trim();
    running = parseInt(result) > 0;
  } catch {}

  return NextResponse.json({ logs, running });
}

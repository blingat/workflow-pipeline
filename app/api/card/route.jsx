// API 라우트는 card_generator.js 사용
import { NextResponse } from 'next/server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const u = new URL(req.url);
    const title = u.searchParams.get('title') || 'AI 뉴스';
    const body = u.searchParams.get('body') || '';
    const source = u.searchParams.get('source') || '';
    const type = u.searchParams.get('type') || 'news';
    const save = u.searchParams.get('save') === 'true';

    // card_generator를 spawn으로 실행 (독립 프로세스)
    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const execFileAsync = promisify(execFile);

    const scriptPath = path.join(process.cwd(), 'card_generator.js');
    const { stdout } = await execFileAsync('node', [scriptPath, title, body || '', source || '', type || 'news'], {
      timeout: 30000,
      cwd: process.cwd(),
    });

    const match = stdout.match(/✅ (.+)/);
    const filePath = match ? match[1].trim() : null;

    if (!filePath) {
      return NextResponse.json({ error: 'Generation failed', stdout }, { status: 500 });
    }

    if (!save) {
      const fs = require('fs');
      const buf = fs.readFileSync(filePath);
      return new NextResponse(buf, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      });
    }

    return NextResponse.json({ path: filePath, url: `/media/cards/${path.basename(filePath)}` });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

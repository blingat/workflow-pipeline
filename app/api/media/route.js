import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MEDIA_DIR = path.join(process.cwd(), 'media');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  const type = searchParams.get('type') || 'cards'; // cards or videos

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const dir = path.join(MEDIA_DIR, type);
  const filePath = path.join(dir, path.basename(file));
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const ext = path.extname(file).toLowerCase();
  const mimeMap = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp4': 'video/mp4', '.webm': 'video/webm', '.gif': 'image/gif' };
  const contentType = mimeMap[ext] || 'application/octet-stream';

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      ...(ext === '.mp4' ? { 'Content-Range': `bytes 0-${buffer.length - 1}/${buffer.length}`, 'Accept-Ranges': 'bytes' } : {}),
    },
  });
}

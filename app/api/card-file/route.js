import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CARDS_DIR = path.join(process.cwd(), 'media', 'cards');

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get('file');
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const filePath = path.join(CARDS_DIR, path.basename(file));
  if (!fs.existsSync(filePath)) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  });
}

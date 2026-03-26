import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM collected_posts ORDER BY collected_at DESC LIMIT 100');
    return NextResponse.json(rows);
  } catch { return NextResponse.json([]); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const score = (body.likes * 1 + body.reposts * 3 + body.replies * 2) / Math.max(body.views || 1, 1) * 1000;
    const rows = await query(
      `INSERT INTO collected_posts (post_id, author, content, likes, reposts, replies, views, engagement_score, hashtags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (post_id) DO UPDATE SET likes=$4, reposts=$5, replies=$6, views=$7, engagement_score=$8
       RETURNING *`,
      [body.post_id, body.author, body.content, body.likes, body.reposts, body.replies, body.views, score, body.hashtags || [], body.created_at]
    );
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const rows = await query('UPDATE collected_posts SET likes=$2, reposts=$3, replies=$4, views=$5 WHERE post_id=$1 RETURNING *', [body.post_id, body.likes, body.reposts, body.replies, body.views]);
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    await query('DELETE FROM collected_posts WHERE id=$1', [searchParams.get('id')]);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

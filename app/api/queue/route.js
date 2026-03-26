import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM publish_queue ORDER BY scheduled_at DESC LIMIT 100');
    return NextResponse.json(rows);
  } catch { return NextResponse.json([]); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rows = await query(
      `INSERT INTO publish_queue (persona_id, content, status, scheduled_at, account)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [body.persona_id, body.content, body.status || 'pending', body.scheduled_at, body.account]
    );
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req) {
  try {
    const body = await req.json();
    const rows = await query('UPDATE publish_queue SET status=$2, published_at=$3, engagement_after=$4 WHERE id=$1 RETURNING *', [body.id, body.status, body.published_at, body.engagement_after]);
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    await query('DELETE FROM publish_queue WHERE id=$1', [searchParams.get('id')]);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

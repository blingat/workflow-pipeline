import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const rows = await query('SELECT * FROM personas ORDER BY created_at DESC');
    return NextResponse.json(rows);
  } catch { return NextResponse.json([]); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const rows = await query(
      `INSERT INTO personas (id, name, version, tone, emoji_usage, content_length, base_prompt, target_audience, linked_account)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET name=$2, version=$3, tone=$4, emoji_usage=$5, content_length=$6, base_prompt=$7, target_audience=$8, linked_account=$9, updated_at=NOW()
       RETURNING *`,
      [body.id, body.name, body.version, body.tone, body.emoji_usage, body.content_length, body.base_prompt, body.target_audience, body.linked_account]
    );
    return NextResponse.json(rows[0]);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    await query('DELETE FROM personas WHERE id=$1', [searchParams.get('id')]);
    return NextResponse.json({ ok: true });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

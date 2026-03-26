import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const r = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM collected_posts) as collected,
        (SELECT COUNT(*)::int FROM analysis_results) as analyzed,
        (SELECT COUNT(*)::int FROM publish_queue WHERE status IN ('pending','approved')) as curated,
        (SELECT COUNT(*)::int FROM publish_queue WHERE status='approved') as approved,
        (SELECT COUNT(*)::int FROM publish_queue WHERE status='published') as published,
        (SELECT COUNT(*)::int FROM publish_queue WHERE status='viral') as viral,
        (SELECT COUNT(*)::int FROM publish_queue WHERE status='failed') as failed,
        (SELECT COUNT(*)::int FROM publish_queue WHERE status='pending') as pending
    `);
    return NextResponse.json(r[0]);
  } catch { return NextResponse.json({ collected: 0, analyzed: 0, curated: 0, approved: 0, published: 0, viral: 0, failed: 0, pending: 0 }); }
}

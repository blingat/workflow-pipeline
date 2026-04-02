const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require' });
(async () => {
  const c = await pool.query("SELECT (SELECT count(*) FROM collected_posts) c1, (SELECT count(*) FROM analysis_results) c2, (SELECT count(*) FROM publish_queue WHERE status='pending') c3, (SELECT count(*) FROM publish_queue WHERE media_url IS NOT NULL) c4, (SELECT count(*) FROM keyword_trends) c5");
  console.log('수집:', c.rows[0].c1, '| 분석:', c.rows[0].c2, '| 대기:', c.rows[0].c3, '| 카드있음:', c.rows[0].c4, '| 트렌드:', c.rows[0].c5);
  const s = await pool.query("SELECT id, substring(content,1,100) as post, comment_text, comment_2, source_url FROM publish_queue ORDER BY id DESC LIMIT 5");
  for (const r of s.rows) {
    console.log('\n#' + r.id + ': ' + r.post);
    console.log('  댓글1: ' + (r.comment_text || '없음'));
    console.log('  댓글2: ' + (r.comment_2 || '없음'));
    console.log('  출처: ' + (r.source_url || '없음'));
  }
  await pool.end();
})();

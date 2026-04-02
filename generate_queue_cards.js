// generate_queue_cards.js — card_generator v3 --queue 호출
const { execSync } = require('child_process');

try {
  const result = execSync('node card_generator.js --queue', {
    cwd: __dirname, timeout: 120000, encoding: 'utf-8',
    env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
  });
  console.log(result.trim());
} catch (e) {
  console.log('❌', e.message?.substring(0, 100));
}

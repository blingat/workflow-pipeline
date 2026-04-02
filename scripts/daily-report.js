#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const { execSync } = require('child_process');

// Neon DB connection from TOOLS.md
const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function generateDailyReport() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log(`Generating daily report for ${today}`);

        // Initialize PostgreSQL client
        const client = new Client({
            connectionString: DB_URL,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();

        // 1. collected_posts 당일 수
        const collectedQuery = `
            SELECT COUNT(*) as count 
            FROM collected_posts 
            WHERE DATE(collected_at) = '${today}'
        `;
        const collectedResult = await client.query(collectedQuery);
        const collectedCount = parseInt(collectedResult.rows[0].count);

        // 2. analysis_results 당일 수
        const analysisQuery = `
            SELECT COUNT(*) as count 
            FROM analysis_results 
            WHERE DATE(analyzed_at) = '${today}'
        `;
        const analysisResult = await client.query(analysisQuery);
        const analysisCount = parseInt(analysisResult.rows[0].count);

        // 3. publish_queue 누적 카운트
        const publishQuery = `
            SELECT status, COUNT(*) as count 
            FROM publish_queue 
            GROUP BY status
        `;
        const publishResult = await client.query(publishQuery);
        const publishCounts = {};
        publishResult.rows.forEach(row => {
            publishCounts[row.status] = parseInt(row.count);
        });

        // 4. 에이징: /tmp/aging_v7.log 오늘 결과
        let agingStats = { likes: 0, follows: 0, reposts: 0, comments: 0 };
        try {
            if (fs.existsSync('/tmp/aging_v7.log')) {
                const agingLog = fs.readFileSync('/tmp/aging_v7.log', 'utf8');
                const todayEntries = agingLog.split('\n').filter(line => {
                    return line.includes(today) && (line.includes('likes:') || line.includes('follows:') || line.includes('reposts:') || line.includes('comments:'));
                });
                
                todayEntries.forEach(entry => {
                    if (entry.includes('likes:')) {
                        agingStats.likes += parseInt(entry.match(/likes:\s*(\d+)/)?.[1] || 0);
                    }
                    if (entry.includes('follows:')) {
                        agingStats.follows += parseInt(entry.match(/follows:\s*(\d+)/)?.[1] || 0);
                    }
                    if (entry.includes('reposts:')) {
                        agingStats.reposts += parseInt(entry.match(/reposts:\s*(\d+)/)?.[1] || 0);
                    }
                    if (entry.includes('comments:')) {
                        agingStats.comments += parseInt(entry.match(/comments:\s*(\d+)/)?.[1] || 0);
                    }
                });
            } else {
                console.log('Aging log file not found at /tmp/aging_v7.log');
            }
        } catch (error) {
            console.error('Error reading aging log:', error.message);
        }

        // 5. 서버 상태
        let diskUsage = 'N%';
        let memoryUsage = 'N%';
        try {
            const dfOutput = execSync('df -h /', { encoding: 'utf8' });
            const dfLines = dfOutput.split('\n');
            if (dfLines.length > 1) {
                const usageMatch = dfLines[1].match(/(\d+)%/);
                if (usageMatch) {
                    diskUsage = `${usageMatch[1]}%`;
                }
            }

            const freeOutput = execSync('free -m', { encoding: 'utf8' });
            const freeLines = freeOutput.split('\n');
            if (freeLines.length > 1) {
                const memMatch = freeLines[1].match(/Mem:\s*\d+\s*\d+\s*(\d+)/);
                if (memMatch) {
                    const used = parseInt(memMatch[1]);
                    const total = parseInt(freeLines[1].match(/Mem:\s*(\d+)/)?.[1] || 0);
                    memoryUsage = `${Math.round((used / total) * 100)}%`;
                }
            }
        } catch (error) {
            console.error('Error getting server stats:', error.message);
        }

        await client.end();

        // 6. 내일 예정 작업 안내
        const tomorrowTasks = '에이징 자동, 수집 2회';

        // Format the message
        const date = new Date().toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const message = `🌙 AI파카 일일 마감 (${date})
📊 당일: 수집 ${collectedCount} | 분석 ${analysisCount} | 발행 0
📋 큐 누적: 대기 ${publishCounts.pending || 0} | 승인 ${publishCounts.approved || 0} | 완료 ${publishCounts.published || 0} | 실패 ${publishCounts.failed || 0}
🦙 에이징: 좋아요 ${agingStats.likes} | 팔로우 ${agingStats.follows} | 리포스트 ${agingStats.reposts} | 댓글 ${agingStats.comments}
🖥️ 서버: 디스크 ${diskUsage} | 메모리 ${memoryUsage}
📋 내일: ${tomorrowTasks}`;

        // Save report to file
        const reportPath = `/tmp/daily_report_${today}.txt`;
        fs.writeFileSync(reportPath, message);
        console.log(`Report saved to: ${reportPath}`);

        // Try to send to Telegram if webhook is configured
        try {
            const telegramWebhook = process.env.TELEGRAM_WEBHOOK;
            if (telegramWebhook) {
                const url = `${telegramWebhook}${encodeURIComponent(message)}`;
                const response = await fetch(url);
                console.log(`Telegram webhook response: ${response.status}`);
            }
        } catch (error) {
            console.error('Failed to send to Telegram:', error.message);
        }

        console.log('=== DAILY REPORT ===');
        console.log(message);
        console.log('=== END REPORT ===');
        
        // Return the message for potential delivery
        return message;

    } catch (error) {
        console.error('Error generating daily report:', error);
        // Return error message that can be delivered
        return `❌ 리포트 생성 오류: ${error.message}`;
    }
}

// Main execution
if (require.main === module) {
    generateDailyReport()
        .then(report => {
            console.log('Daily report execution completed');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed to generate daily report:', error);
            process.exit(1);
        });
}

module.exports = { generateDailyReport };
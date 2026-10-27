const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 5080;
const DB_PATH = path.join(__dirname, 'leaderboard.db');
const SEED_FILE = path.join(__dirname, '..', 'ref', 'leaderboard-combined.json');

// Initialize SQLite database
const db = new DatabaseSync(DB_PATH);

// Create table matching GameResult schema
db.exec(`
  CREATE TABLE IF NOT EXISTS game_results (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    score INTEGER NOT NULL,
    capturedChips INTEGER NOT NULL,
    goldenChips INTEGER NOT NULL,
    bombPenalties INTEGER NOT NULL,
    bestCombo INTEGER NOT NULL,
    speedCaptures INTEGER DEFAULT 0,
    eligibleOpportunities INTEGER NOT NULL,
    accuracy REAL,
    xpEarned INTEGER NOT NULL,
    mode TEXT NOT NULL,
    createdAtUtc TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_score ON game_results(score DESC);
  CREATE INDEX IF NOT EXISTS idx_created_at ON game_results(createdAtUtc DESC);
`);

// Prepared statements
const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO game_results (
    id, nickname, score, capturedChips, goldenChips, bombPenalties,
    bestCombo, speedCaptures, eligibleOpportunities, accuracy,
    xpEarned, mode, createdAtUtc
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?
  )
`);

const countStmt = db.prepare('SELECT COUNT(*) as count FROM game_results');
const existingCount = countStmt.get().count;

// Seed initial data from ref/leaderboard-combined.json if database is newly initialized
if (existingCount === 0 && fs.existsSync(SEED_FILE)) {
  try {
    const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    console.log(`[server] Seeding SQLite database from ${SEED_FILE} (${seedData.length} records)...`);
    for (const item of seedData) {
      insertStmt.run(
        item.id || ('rec_' + Math.random().toString(36).substring(2, 10)),
        item.nickname,
        item.score,
        item.capturedChips || 0,
        item.goldenChips || 0,
        item.bombPenalties || 0,
        item.bestCombo || 0,
        item.speedCaptures || 0,
        item.eligibleOpportunities || (item.capturedChips + item.goldenChips) || 0,
        item.accuracy ?? null,
        item.xpEarned || Math.round(item.score * 1.5),
        item.mode || 'webcam',
        item.createdAt || new Date().toISOString()
      );
    }
    console.log('[server] SQLite database seeding complete.');
  } catch (err) {
    console.error('[server] Error seeding SQLite database:', err);
  }
}

// Helpers
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { status: 'healthy', database: 'sqlite', records: countStmt.get().count });
  }

  // GET /api/leaderboard/daily & /api/leaderboard/all-time
  if (req.method === 'GET' && pathname.startsWith('/api/leaderboard/')) {
    const isDaily = pathname.includes('/daily');
    const limit = Math.min(100, Math.max(1, parseInt(parsedUrl.searchParams.get('limit') || '50', 10)));

    let rows;
    if (isDaily) {
      const today = new Date().toISOString().slice(0, 10);
      const query = db.prepare(`
        SELECT id, nickname, score, bestCombo, capturedChips, mode, createdAtUtc
        FROM game_results
        WHERE createdAtUtc LIKE ?
        ORDER BY score DESC, createdAtUtc ASC
        LIMIT ?
      `);
      rows = query.all(`${today}%`, limit);
    } else {
      const query = db.prepare(`
        SELECT id, nickname, score, bestCombo, capturedChips, mode, createdAtUtc
        FROM game_results
        ORDER BY score DESC, createdAtUtc ASC
        LIMIT ?
      `);
      rows = query.all(limit);
    }

    const result = rows.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      nickname: row.nickname,
      score: row.score,
      bestCombo: row.bestCombo,
      capturedChips: row.capturedChips,
      mode: row.mode,
      createdAtUtc: row.createdAtUtc,
    }));

    return sendJson(res, 200, result);
  }

  // POST /api/games/results
  if (req.method === 'POST' && pathname === '/api/games/results') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 32768) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        if (!item.nickname || typeof item.score !== 'number') {
          return sendJson(res, 400, { error: 'Invalid payload: nickname and score are required.' });
        }

        const id = item.id || ('rec_' + Math.random().toString(36).substring(2, 10));
        const createdAt = item.createdAt || new Date().toISOString();

        insertStmt.run(
          id,
          String(item.nickname).slice(0, 50).trim(),
          Math.max(0, Math.min(999999, Math.round(item.score))),
          Math.max(0, Math.round(item.capturedChips || 0)),
          Math.max(0, Math.round(item.goldenChips || 0)),
          Math.max(0, Math.round(item.bombPenalties || 0)),
          Math.max(0, Math.round(item.bestCombo || 0)),
          Math.max(0, Math.round(item.speedCaptures || 0)),
          Math.max(0, Math.round(item.eligibleOpportunities || 0)),
          typeof item.accuracy === 'number' ? item.accuracy : null,
          Math.max(0, Math.round(item.xpEarned || 0)),
          String(item.mode || 'webcam').slice(0, 20),
          createdAt
        );

        return sendJson(res, 200, {
          id,
          nickname: item.nickname,
          score: item.score,
          createdAtUtc: createdAt,
        });
      } catch (err) {
        return sendJson(res, 400, { error: 'Malformed JSON payload.' });
      }
    });
    return;
  }

  // Fallback 404
  return sendJson(res, 404, { error: 'Not Found' });
});

server.listen(PORT, () => {
  console.log(`[server] SQLite leaderboard API running at http://localhost:${PORT}`);
});

'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const SAVES_FILE = path.join(DATA_DIR, 'saves.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.use(express.json());

// ─── Rate limiter (60 requests per minute per IP) ─────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
});

// ─── Restricted static file serving (frontend assets only) ───────────────
const ALLOWED_STATIC = new Set(['index.html', 'style.css', 'app.js']);
app.get('/', apiLimiter, (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/:file', apiLimiter, (req, res, next) => {
  const file = req.params.file;
  if (ALLOWED_STATIC.has(file)) {
    return res.sendFile(path.join(__dirname, file));
  }
  return next();
});

// ─── Health ────────────────────────────────────────────────────────────────

app.get('/api/health', apiLimiter, (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Save / Load ──────────────────────────────────────────────────────────

app.post('/api/save', apiLimiter, (req, res) => {
  try {
    const { slot = 'default', state } = req.body;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Invalid state' });
    }
    let saves = {};
    if (fs.existsSync(SAVES_FILE)) {
      saves = JSON.parse(fs.readFileSync(SAVES_FILE, 'utf8'));
    }
    const savedAt = new Date().toISOString();
    saves[slot] = { state, savedAt };
    fs.writeFileSync(SAVES_FILE, JSON.stringify(saves, null, 2));
    res.json({ ok: true, slot, savedAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/load', apiLimiter, (req, res) => {
  try {
    const slot = req.query.slot || 'default';
    if (!fs.existsSync(SAVES_FILE)) {
      return res.json({ ok: false, state: null });
    }
    const saves = JSON.parse(fs.readFileSync(SAVES_FILE, 'utf8'));
    const entry = saves[slot];
    if (!entry) {
      return res.json({ ok: false, state: null });
    }
    res.json({ ok: true, slot, state: entry.state, savedAt: entry.savedAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Leaderboard ─────────────────────────────────────────────────────────

app.get('/api/leaderboard', apiLimiter, (_req, res) => {
  try {
    if (!fs.existsSync(LEADERBOARD_FILE)) {
      return res.json([]);
    }
    const board = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    res.json(board);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/leaderboard', apiLimiter, (req, res) => {
  try {
    const { name, score, stage, kills } = req.body;
    if (!name || typeof score !== 'number') {
      return res.status(400).json({ error: 'name and numeric score required' });
    }
    let board = [];
    if (fs.existsSync(LEADERBOARD_FILE)) {
      board = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    }
    const entry = { name, score, stage: stage || 1, kills: kills || 0, time: new Date().toISOString() };
    board.push(entry);
    board.sort((a, b) => b.score - a.score);
    board = board.slice(0, 100); // keep top 100
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(board, null, 2));
    const rank = board.indexOf(entry) + 1;
    res.json({ ok: true, rank });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────

/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MinetoBattle server running on http://localhost:${PORT}`);
  });
}

module.exports = app;

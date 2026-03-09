'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const SAVES_FILE = path.join(DATA_DIR, 'saves.json');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const authSessions = new Map();

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

function normalizeUsername(input) {
  const name = String(input || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(name)) return null;
  return name;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || '')).digest('hex');
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function createSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  authSessions.set(token, { username, createdAt: Date.now() });
  return token;
}

function parseBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

function requireAuth(req, res, next) {
  const token = parseBearerToken(req);
  if (!token) return res.status(401).json({ error: 'auth required' });
  const session = authSessions.get(token);
  if (!session) return res.status(401).json({ error: 'invalid session' });
  if (Date.now() - session.createdAt > AUTH_TTL_MS) {
    authSessions.delete(token);
    return res.status(401).json({ error: 'session expired' });
  }
  req.authUser = session.username;
  return next();
}

// ─── Auth ──────────────────────────────────────────────────────────────────

app.post('/api/auth/register', apiLimiter, (req, res) => {
  try {
    const username = normalizeUsername(req.body && req.body.username);
    const password = String((req.body && req.body.password) || '');
    if (!username) {
      return res.status(400).json({ error: 'username must be 3-24 chars: a-z, 0-9, _' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 chars' });
    }
    const users = readJsonFile(USERS_FILE, {});
    if (users[username]) {
      return res.status(409).json({ error: 'username already exists' });
    }
    users[username] = { passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
    writeJsonFile(USERS_FILE, users);
    const token = createSession(username);
    res.json({ ok: true, username, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/login', apiLimiter, (req, res) => {
  try {
    const username = normalizeUsername(req.body && req.body.username);
    const password = String((req.body && req.body.password) || '');
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const users = readJsonFile(USERS_FILE, {});
    const user = users[username];
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const token = createSession(username);
    res.json({ ok: true, username, token });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/auth/me', apiLimiter, requireAuth, (req, res) => {
  res.json({ ok: true, username: req.authUser });
});

// ─── Save / Load ──────────────────────────────────────────────────────────

app.post('/api/save', apiLimiter, requireAuth, (req, res) => {
  try {
    const { slot = 'default', state } = req.body;
    if (!state || typeof state !== 'object') {
      return res.status(400).json({ error: 'Invalid state' });
    }
    const username = req.authUser;
    const saves = readJsonFile(SAVES_FILE, {});
    if (!saves[username]) saves[username] = {};
    const savedAt = new Date().toISOString();
    saves[username][slot] = { state, savedAt };
    writeJsonFile(SAVES_FILE, saves);
    res.json({ ok: true, username, slot, savedAt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/load', apiLimiter, requireAuth, (req, res) => {
  try {
    const username = req.authUser;
    const slot = req.query.slot || 'default';
    if (!fs.existsSync(SAVES_FILE)) {
      return res.json({ ok: false, state: null });
    }
    const saves = readJsonFile(SAVES_FILE, {});
    const userSaves = saves[username] || {};
    const entry = userSaves[slot];
    if (!entry) {
      return res.json({ ok: false, state: null });
    }
    res.json({ ok: true, username, slot, state: entry.state, savedAt: entry.savedAt });
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
